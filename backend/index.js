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

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  //authorize(JSON.parse(content), listOwnEvents);
  authorize(JSON.parse(content), listOwnEvents);
});

/**
* Create an OAuth2 client with the given credentials, and then execute the
* given callback function.
* @param {Object} credentials The authorization client credentials.
* @param {function} callback The callback to call with the authorized client.
*/
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
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
      callback(oAuth2Client);
    });
  });
}

function createCal(auth) {
  const calendar = google.calendar({version: 'v3', auth});

  calendar.calendars.insert({
      auth: auth,
      resource: {
          summary: 'ottoPlan Meetings',
          description: 'Meetings scheduled by ottoPlan',
          // TODO: set timeZone to the same as 'primary' calendar
          timeZone: calendar.calendars[primary].timeZone
      }
  }, function (err, resp) {
      if (err) {
          console.log(err);
      } 
      else {
        console.log(resp);
      }
  })
}

/**
* Lists the next 10 events on the user's primary calendar.
* @param {google.auth.OAuth2} auth An authorized OAuth2 client.
*/
async function listOwnEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});

  await console.log(calendar.calendarList.list());
    /*
  var calendars_list = {};
  await calendar.calendarList.list()
    .then(resp => {
        //console.log(resp.data.items);
        calendars_list = resp.data.items;
        //console.log(calendars_list = Object.assign({}, resp.data.items));
    }).catch(err => {
        console.log(err.message);
    });

  var own_calendars = [];
  for (var key in Object.keys(calendars_list)) {
      if (calendars_list[key].accessRole == 'owner') {
          own_calendars.push(calendars_list[key]);
      }
  }

  for (var key in Object.keys(own_calendars)) {
      calendar.events.list({
        // replace 'primary' with 'ID'
        calendarId: own_calendars[key].id,
        timeMin: (new Date()).toISOString(),
        // TODO: End of time window
        // timeMax: (),
        //maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const events = res.data.items;
        if (events.length) {
          console.log('Upcoming 10 events:');
          events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            console.log(`${start} - ${event.summary}`);
          });
        } else {
          console.log('No upcoming events found.');
        }
      });
  }
  */
}

function createEvent(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  var event = {
      summary: 'Test Event #3',
      location: 'WCH 69',
      description: 'where my notifications @ tho',
      start: {
          dateTime: '2020-02-17T20:00:00-05:00',
          timeZone: 'America/Los_Angeles'
      },
      end: {
          dateTime: '2020-02-17T20:00:00-09:00',
          timeZone: 'America/Los_Angeles'
      },
      attendees: [{ email: 'ewong012@ucr.edu' }],
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
          calendarId: 'primary',
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
