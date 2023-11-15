'use strict';

const { Client } = require('@notionhq/client');
const { PubSub } = require('@google-cloud/pubsub');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const settings = {
  preferRest: true,
  timestampsInSnapshots: true
};
db.settings(settings);

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const functions = require('@google-cloud/functions-framework');

function mapNotionTypeToFirestore(value) {
  switch (value.type) {
    case 'title':
    case 'rich_text':
      return value[value.type].length ? value[value.type][0].plain_text : null;
    case 'relation':
      return value.relation.map((relation) => relation.id);
    case 'multi_select':
      return value.multi_select.map((select) => select.name);
    case 'select':
      return value.select.name;
    case 'date':
      var v = value['date']
      if (!v['end']) return v['start']?new Date(v['start']):null;
      return {
        'start': v['start']?new Date(v['start']):null, 
        'end': v['end']?new Date(v['end']):null, 
        'time_zone': v['time_zone']?v['time_zone']:null
      };
    case 'last_edited_time':
      return new Date(value[value.type]);
    case 'url':
    case 'email':
    case 'formula':
    case 'number':
    case 'checkbox':
          return value[value.type];
    case 'unique_id':
      return `${value.unique_id.prefix}-${value.unique_id.number}`;
    default:
      console.debug(`Unknown property type '${value.type}'`);
      return value;
  }
}

function transformRecord(record) {
  var newRecord = {
    id: record.id,
    created_time: record.created_time,
    last_edited_time: record.last_edited_time
  };
  for (var key in record.properties) {
    // console.debug('Processing key: ' + key)
    var value = record.properties[key];
    
    // id is a reserved word in Firestore, so we use key instead
    newRecord[value.type === 'unique_id'?'key':key] = mapNotionTypeToFirestore(value);    
  }
  newRecord.raw = record;
  return newRecord;
}

// Function to fetch new records from Notion and process them
async function fetchNewNotionRecords(database_id) {
  const dbRef = db.collection(process.env.FIRSTORE_COLLECTION).doc(database_id);
  const doc = await dbRef.get();
  
  const lastProcessedAt = doc.exists?doc.data().processedAt:null;

  console.debug(`Last processed timestamp: ${lastProcessedAt} for database ${database_id}`);

  var maxRecordDate = null;
  var start_cursor = undefined;

  while (true) {
    const response = await notion.databases.query({ 
      database_id: database_id,
      filter: lastProcessedAt?{
        "timestamp": "last_edited_time",
        "last_edited_time": {
          "on_or_after": lastProcessedAt
        }
      }:undefined,
      start_cursor: start_cursor
    });
    const records = response.results;
    start_cursor = response.next_cursor;

    const promises = records.map(async (record) => {
      const docRef = dbRef.collection('records').doc(record.id);
      const doc = await docRef.get('last_edited_time'); // Only retrieve the last_edited_time field

      maxRecordDate = (maxRecordDate && maxRecordDate > new Date(record.last_edited_time))?maxRecordDate:new Date(record.last_edited_time);

      if (doc.exists &&  doc.data().last_edited_time === record.last_edited_time){
        console.debug(`Skipping record ${record.id} as it has not changed`);
        return;
      }
      
      if (doc.exists) {
        console.debug(`Updating record ${record.id}`);
        return docRef.update(transformRecord(record));
      }

      console.debug(`Creating record ${record.id}`);
      return docRef.set(transformRecord(record));
    });

    await Promise.all(promises);

    if (!response.has_more) {
      break;
    }
  }

  // Update the last processed timestamp, taking into account the last record's last_edited_time
  // but shifting it back 5 minutes to avoid missing any records
  if (maxRecordDate) {
    await dbRef.set({
      processedAt: new Date((maxRecordDate>new Date()?maxRecordDate:new Date()) - 5 * 60 * 1000).toISOString()
    });
  }
  await dbRef.update({
    runAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function runNotionSync() {
  const database_ids = process.env.NOTION_DATABASE_IDS.split(',');
  await Promise.all(database_ids.map(fetchNewNotionRecords));
}

functions.cloudEvent('notionSync', runNotionSync);

// Check if the script is being run directly
if (require.main === module) {
  runNotionSync();
}