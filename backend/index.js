const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false});

const port = 5000;

/************************** Boilerplate from Google Calendar API ******************************/
/**** It seems that the main function call to access Calendar API needs to occur from within getAccessToken ****/
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
* Create an OAuth2 client with the given credentials, and then execute the
* given callback function.
* @param {Object} credentials The authorization client credentials.
* @param {function} callback The callback to call with the authorized client.
*/
function authorize(credentials, callback, request_data) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, request_data);
  });
}

/**
* Get and store new token after prompting for user authorization, and then
* execute the given callback with the authorized OAuth2 client.
* @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
* @param {getEventsCallback} callback The callback for the authorized client.
*/
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      return callback(oAuth2Client);
    });
  });
}

app.listen(port, () => console.log(`Server started on port ${port}`));

// Receive JSON scheduling request info from frontend
// Send back JSON scheduling response to frontend
// TODO: move this to the appropriate place so that the necessary response info is sent back
app.post('/schedule_event', urlencodedParser, function(req, res) {
    console.log('req.body from frontend: ' + JSON.stringify(req.body));
    console.log('req.body type: ' + typeof req.body);
    var request_data = req.body;
    console.log('request_data from frontend: ' + JSON.stringify(request_data));
    var returned = {};

    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Calendar API.
        
      // Need to call API-accessing function from here
      // scheduleEvent calls other functions to look for available time slot and create event
      returned = authorize(JSON.parse(content), scheduleEvent, request_data);
    });

    console.log('returned: ' + returned);

    var data_out = require('./test_in');
    data_out.event_info.summary = req.body.summary;
    res.json(data_out);
});

/*
app.get('/schedule_event', (req, res) => {
  var info_in = req.body;
  console.log('req.body.success: ' + req.body);

  var data_out = require('./test_in');
  res.json(data_out);
});
*/

async function scheduleEvent(auth, request_data) {
    console.log('request_data: ' + JSON.stringify(request_data));
    console.log('request_data.start_time: ' + request_data.start_time);

    var own_calendars = getOwnEvents(auth);
    console.log('own_calendars: ' + JSON.stringify(own_calendars));
    var otto_cal_ID = getOttoCal(auth, own_calendars);
    listOwnEvents(auth, own_calendars, request_data);

    var msg = "Temporary message";

    return msg;
}

/* Adapted from Google Calendar API's Node.js Quickstart
* @param {google.auth.OAuth2} auth An authorized OAuth2 client.
* Fetches and returns list of calendars owned by user
* If no ottoPlan Meetings calendar, creates one
*/
async function getOwnEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});

  var calendars_list = {};
  await calendar.calendarList.list()
    .then(resp => {
        //console.log(resp.data.items);
        calendars_list = resp.data.items;
          // Create list of calendars owned by user
          var own_calendars = [];
          var otto_cal_ID = '';
          for (var key in Object.keys(calendars_list)) {
              if (calendars_list[key].accessRole == 'owner') {
                  own_calendars.push(calendars_list[key]);
              }
              // Search for existing ottoPlan calendar
              if (calendars_list[key].summary == 'ottoPlan Meetings') {
                  otto_cal_ID = calendars_list[key].id;
              }
          }
          //console.log('within getOwnEvents, own_calendars: ' + JSON.stringify(own_calendars));


          return own_calendars;
    }).catch(err => {
        console.log(err.message);
    });

}

async function getOttoCal(auth, own_calendars) {

  var otto_cal_ID = '';
  for (var key in Object.keys(own_calendars)) {
      // Search for existing ottoPlan calendar
      if (own_calendars[key].summary == 'ottoPlan Meetings') {
          otto_cal_ID = own_calendars[key].id;
      }
  }

  // If no ottoPlan calendar, create one
  if (otto_cal_ID == '') {
      console.log('No ottoPlan calendar; creating new');
      otto_cal_ID = await createCal(auth);
  }
  else {
      console.log('Owned ottoPlan calendar exists');
  }
  //createEvent(auth, otto_cal_ID);

  return otto_cal_ID;
}


function listOwnEvents(auth, own_calendars, request_data) {
  const calendar = google.calendar({version: 'v3', auth});

  console.log('listOwnEvents beginning...');
    
  // List events in calendars owned by user
  for (var key in Object.keys(own_calendars)) {
      calendar.events.list({
        // replace 'primary' with 'ID'
        calendarId: own_calendars[key].id,
        //timeMin: (new Date()).toISOString(),
        timeMin: request_data.scheduling_info.start.dateTime,
        // TODO: End of time window
        timeMax: request_data.scheduling_info.end.dateTime,
        //maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const events = res.data.items;
        if (events.length) {
          console.log('Upcoming events betweeen ' + request_data.scheduling_info.start.dateTime + ' and ' + request_data.scheduling_info.end.dateTime + ':');
          events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            console.log(`${start} - ${event.summary}`);
          });
        } else {
          console.log('No upcoming events found.');
        }
      });
  }
  console.log('listOwnEvents concluded');
}

async function createCal(auth) {
  const calendar = google.calendar({version: 'v3', auth});

  // Retrieve time zone of primary calendar to set for new calendar
  var time_zone = '';
  await calendar.calendars.get({
      calendarId: 'primary'
  })
    .then(resp => {
        //console.log(resp.data.timeZone);
        time_zone = resp.data.timeZone;
    }).catch(err => {
        console.log(err.message);
    });
    
  // Create new calendar
  var new_id = '';
  await calendar.calendars.insert({
      auth: auth,
      resource: {
          summary: 'ottoPlan Meetings',
          description: 'Meetings scheduled by ottoPlan',
          // Set timeZone to same as primary calendar
          timeZone: time_zone
      }
  })
    .then(resp => {
      console.log('Calendar created');
      new_id = resp.data.id;
    }).catch(err => {
        console.log('Failed to create new calendar: ' + err.message);
    });

  // Return calendar ID
  // console.log('New calendar ID: ' + new_id);
  return new_id;
}

function createEvent(auth, otto_cal_ID) {
  var data_in = require('./test_in');
  //console.log(data_in);

  const calendar = google.calendar({version: 'v3', auth});
  var event = {
      summary: data_in.event_info.summary,
      location: data_in.event_info.location,
      description: data_in.event_info.description,
      start: {
          dateTime: data_in.scheduling_info.start.dateTime,
          //dateTime: '2020-02-19T20:00:00-05:00',
          //timeZone: 'America/Los_Angeles'
          timeZone: data_in.scheduling_info.start.timeZone
      },
      end: {
          dateTime: data_in.scheduling_info.end.dateTime,
          //dateTime: '2020-02-19T20:00:00-09:00',
          // timeZone: 'America/Los_Angeles'
          timeZone: data_in.scheduling_info.end.timeZone
      },
      attendees: data_in.event_info.attendees,
      /*
      [
          { email: 'ewong012@ucr.edu'}, 
          { email: 'armanddeforest@gmail.com' }
      ],
      */
      reminders: {
          useDefault: false,
          overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 10 }
          ]
      }
  };

  calendar.events.insert(
      {
          auth: auth,
          calendarId: otto_cal_ID,
          resource: event,
          sendNotifications: true,
      },
      function(err, event) {
          if (err) {
              console.log('Error contacting Calendar: ' + err);
              return;
          }
          console.log('Event created: %s', event.data.htmlLink);
      }
  );
}
