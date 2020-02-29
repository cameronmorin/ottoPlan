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
  console.log('Authorize this app by visiting this url:', authUrl, '\n');
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
        console.log('Token stored to', TOKEN_PATH, '\n');
      });
      return callback(oAuth2Client);
    });
  });
}

app.listen(port, () => console.log(`Server started on port ${port}\n`));

// Receive JSON scheduling request info from frontend
// Send back JSON scheduling response to frontend
// TODO: move this to the appropriate place so that the necessary response info is sent back
app.post('/schedule_event', urlencodedParser, function(req, res) {
    console.log('req.body from frontend: ' + JSON.stringify(req.body), '\n');
    console.log('req.body type: ' + typeof req.body, '\n');
    var request_data = req.body;
    console.log('request_data from frontend: ' + JSON.stringify(request_data), '\n');
    var returned = {};

    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err, '\n');
      // Authorize a client with credentials, then call the Google Calendar API.
        
      // Need to call API-accessing function from here
      // scheduleEvent calls other functions to look for available time slot and create event
      returned = authorize(JSON.parse(content), scheduleEvent, request_data);
    });

    console.log('returned: ' + returned, '\n');

    var data_out = require('./test_in');
    data_out.event_info.summary = req.body.summary;
    res.json(data_out);
});

/* TODO: remove
app.get('/schedule_event', (req, res) => {
  var info_in = req.body;
  console.log('req.body.success: ' + req.body, '\n');

  var data_out = require('./test_in');
  res.json(data_out);
});
*/

/* #1 in the async function daisy chain
 * Calls getOwnEvents which returns a JSON of the user's own events
 */
async function scheduleEvent(auth, request_data) {
    console.log('request_data: ' + JSON.stringify(request_data), '\n');
    console.log('request_data.start_time: ' + request_data.start_time, '\n');

    return await getOwnEvents(auth, request_data);
    /*

    console.log('own_calendars: ' + JSON.stringify(own_calendars), '\n');
    var otto_cal_ID = getOttoCal(auth, own_calendars);
    listOwnEvents(auth, own_calendars, request_data);

    var msg = "Temporary message";

    return msg;
    */
}

/* Adapted from Google Calendar API's Node.js Quickstart
* @param {google.auth.OAuth2} auth An authorized OAuth2 client.
* Fetches and returns list of calendars owned by user
* If no ottoPlan Meetings calendar, creates one
*/
// Receives request_data to pass on to next function called
// Only way I can think to do it because of async/await
async function getOwnEvents(auth, request_data) {
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
              /* Deprecated; no longer using ottoPlan calendar to reduce permissions
              // Search for existing ottoPlan calendar
              if (calendars_list[key].summary == 'ottoPlan Meetings') {
                  otto_cal_ID = calendars_list[key].id;
              }
              */
          }
          //console.log('within getOwnEvents, own_calendars: ' + JSON.stringify(own_calendars));
          
          return listOwnEvents(auth, own_calendars, otto_cal_ID, request_data);
    }).catch(err => {
        console.log(err.message, '\n');
    });

}

/* No longer needed at this time; handled in getOwnEvents
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
      console.log('No ottoPlan calendar; creating new\n');
      otto_cal_ID = await createCal(auth);
  }
  else {
      console.log('Owned ottoPlan calendar exists\n');
  }
  //createEvent(auth, otto_cal_ID);

  return otto_cal_ID;
}*/


// Creates list of owned events using start/end time in request_data
// Calls createEvent to schedule the event
async function listOwnEvents(auth, own_calendars, otto_cal_ID, request_data) {
  const calendar = google.calendar({version: 'v3', auth});
    
  /* Deprecated; no longer creating/using ottoPlan calendar to reduce permissions
  // If no ottoPlan calendar, create one
  if (otto_cal_ID == '') {
      otto_cal_ID = await createCal(auth)
  }
  */

  console.log('listOwnEvents begin...\n');
  //console.log('request_data.start_time' + request_data.start_time, '\n');
  //console.log('request_data.end_time' + request_data.end_time, '\n');
  //console.log('request_data: ' + JSON.stringify(request_data), '\n');

  var own_events = [];
  // Honestly, I don't understand why 'i' makes everything work, but it does.
  // I tried replacing it with 'key', but that made everything blow up
  var i = 0;
  for (var key in Object.keys(own_calendars)) {
  // iterating numerically to call a function after last iteration, thereby bypassing await/async issue
  //for (i = 0; i < Object.keys(own_calendars).length; i++){
      //console.log('(in loop) Calendar: ' + JSON.stringify(own_calendars[key].id), '\n');

      calendar.events.list({
        calendarId: own_calendars[key].id,
        //timeMin: (new Date()).toISOString(),
        //TODO: after getting form to send the correct JSON, update these
        //timeMin: request_data.scheduling_info.start.dateTime,
        timeMin: request_data.start_time,
        // TODO: End of time window
        //timeMax: request_data.scheduling_info.end.dateTime,
        timeMax: request_data.end_time,
        //maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',

        // TODO: add relevant events to a list to cross-reference
      }, (err, res) => {
        //console.log('i = ' + i + '; Object.keys(own_calendars).length = ' + Object.keys(own_calendars).length, '\n');
        if (err) return console.log('The API returned an error: ' + err, '\n');
        const events = res.data.items;

        //console.log('Calendar: ' + JSON.stringify(own_calendars[i].id), '\n');

        if (events.length) {
          //console.log('Upcoming events betweeen ' + request_data.scheduling_info.start.dateTime + ' and ' + request_data.scheduling_info.end.dateTime + ':');
          console.log('Upcoming events betweeen ' + request_data.start_time + ' and ' + request_data.end_time + ':');
          events.map((event, key) => {
            own_events.push(event);
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;

            console.log(`${start}-${end} - ${event.summary}\n`);
          });
        } else {
          console.log('No upcoming events found.\n');
        }

        i++;
        // Call next function when all calendars iterated through
        if (i == Object.keys(own_calendars).length) {
          console.log('Calling createEvent...\n');
          createEvent(auth, own_events, request_data).then(function(event) {
              console.log('listOwnEvents event: ' + JSON.stringify(event));
              return event;
          });
          //var event = createEvent(auth, request_data);
          //return createEvent(auth, request_data);
        }
      });
  }
    
  // Add info for time to schedule the event
  //request_data[eventStart] = 
  //request_data[eventEnd] = 

}

async function createEvent(auth, own_events, request_data) {
  //var data_in = require('./test_in');
  //console.log(data_in, '\n');
  console.log('createEvent beginning...\n');
  //console.log('otto_cal_ID: ' + otto_cal_ID, '\n');

  console.log(own_events);
  const calendar = google.calendar({version: 'v3', auth});
  var event = {
      // TODO: Update the rhs of these when form sends correct JSON
      //summary: request_data.event_info.summary,
      summary: request_data.summary,
      //location: request_data.event_info.location,
      location: request_data.location,
      //description: request_data.event_info.description,
      description: request_data.description,
      start: {
          //dateTime: request_data.scheduling_info.start.dateTime,
          dateTime: request_data.start_time,
          //dateTime: '2020-02-19T20:00:00-05:00',
          timeZone: 'America/Los_Angeles'
          //timeZone: request_data.scheduling_info.start.timeZone
      },
      end: {
          dateTime: request_data.end_time,
          //dateTime: '2020-02-19T20:00:00-09:00',
          timeZone: 'America/Los_Angeles'
          // timeZone: request_data.scheduling_info.end.timeZone
      },
      // Importing emails from request_data isn't working right now because it's coming in as a list of email addresses, but we need it as an object in the format below
      //attendees: request_data.email,
      attendees: [
          { email: 'ewong012@ucr.edu'}, 
          { email: 'erin.wong002@email.ucr.edu' }
      ],
      reminders: {
          useDefault: false,
          overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 10 }
          ]
      }
  };

  return new Promise(function(resolve, reject) {
  calendar.events.insert(
      {
          auth: auth,
          //calendarId: otto_cal_ID,
          calendarId: 'aa2ab10qanobloa2g9eqh7i50o@group.calendar.google.com',
          //calendarId: 'primary',
          resource: event,
          sendNotifications: true,
      },
      function(err, event) {
          if (err) {
              console.log('Error creating Calendar event: ' + err, '\n');
              console.log('event: ' + event, '\n');
              event.success = "false";
              event.msg = err;
              console.log('createEvent returning failure...\n');
              reject(event);
          }
          console.log('Event created: %s', event.data.htmlLink, '\n');

          event.success = "true";
          console.log('createEvent event: ' + JSON.stringify(event), '\n');

          console.log('createEvent returning success...\n');
          resolve(event);
      }
  );
  });
}

/* Deprecated; no longer creating ottoPlan calendar
// Creates a new ottoPlan calendar
async function createCal(auth) {
  const calendar = google.calendar({version: 'v3', auth});

  // Retrieve time zone of primary calendar to set for new calendar
  var time_zone = '';
  await calendar.calendars.get({
      calendarId: 'primary'
  })
    .then(resp => {
        //console.log(resp.data.timeZone, '\n');
        time_zone = resp.data.timeZone;
    }).catch(err => {
        console.log(err.message, '\n');
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
      console.log('Calendar created', '\n');
      new_id = resp.data.id;
    }).catch(err => {
        console.log('Failed to create new calendar: ' + err.message, '\n');
    });

  // Return calendar ID
  // console.log('New calendar ID: ' + new_id, '\n');
  return new_id;
}
*/
