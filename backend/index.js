const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
const asyncHandler = require('express-async-handler')

const port = 5000;

/************************** Boilerplate from Google Calendar API ******************************/
/**** It seems that the main function call to access Calendar API needs to occur from within getAccessToken ****/
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
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
// #1 in the async daisy-chain
// Tried and failed to return oAuth2Client to calling function to send directly to subsequent functions
async function authorize(credentials, callback, request_data) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // No reject handled here because this won't be in the final code
    // Auth will be occuring in frontend
    return new Promise( (resolve, reject) => {

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            // This line is incorrect and will be unnecessary after auth is handled in frontend
            if (err) return getAccessToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));

            // Call scheduling function chain
            callback(oAuth2Client, request_data)
                .then(event_info => {
                    //console.log('authorize event_info: ' + JSON.stringify(event_info) + '\n');
                    resolve(event_info);
                })
        });
    });
}

/*
//TODO: make this bitch work
function find_time() {
    var availability = [];
    var window = {
        start_time = request_data.start_time,
        end_time = request_data.end_time,
        duration = (request_data.end_time - request_data.start_time)
    }

    for (user in attendees) {
        
*/



/* Auth handled in frontend
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
// TODO: remove/edit as necessary after frontend auth completion
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
 */

app.listen(port, () => console.log(`Server started on port ${port}\n`));

// Receive JSON scheduling request info from frontend
// Send back JSON scheduling response to frontend
// Utilizes a chain of functions that call each other
app.post('/schedule_event', asyncHandler(async (req, res) => {
    console.log('req.body: ' + JSON.stringify(req.body) + '\n');

    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err, '\n');
        // Authorize a client with credentials, then call the Google Calendar API.

        // API-accessing function called from here
        // authorize calls subsequent functions to look for available time slot and create event
        // TODO: figure out how to authorize for each person
        // Need auth for each attendee in order to access calendars/events for each
        authorize(JSON.parse(content), scheduleEvent, req.body)
            .then(event_info => {
                //console.log('post event_info: ' + JSON.stringify(event_info) + '\n');
                console.log('Sending event_info back to frontend...');
                res.json(event_info);
            });
    });

}));

/* #2 in the async function daisy chain
 * Calls getOwnCal which returns a JSON of the user's own events
 */
// TODO: remove this if unnecessary OR utilize it to manage multiple users' calendars
async function scheduleEvent(auth, request_data) {
    //console.log('request_data: ' + JSON.stringify(request_data), '\n');
    //console.log('request_data.start_time: ' + request_data.start_time, '\n');

    // TODO: use all_busy
    var all_busy = {};
    return new Promise( (resolve, reject) => {
        getOwnCal(auth, all_busy, request_data)
            .then(event_info => {
                //console.log('scheduleEvent event_info: ' + JSON.stringify(event_info) + '\n');
                resolve(event_info);
            })
            .catch(err => {
                reject(err);
            })
    });
}

/* Adapted from Google Calendar API's Node.js Quickstart
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 *
 * Creates list of calendars owned by user to refer to for scheduling
 * Passes list along with other params to next function
 */
// Goes through all of user's calendars and creates a list of the calendars owned by the user
// (expectation is that these will be events that they must actually attend)
// Receives request_data to pass on to next function called
async function getOwnCal(auth, all_busy, request_data) {
    console.log('getOwnCal request_data: ' + JSON.stringify(request_data) + '\n');
    const calendar = google.calendar({version: 'v3', auth});

    return new Promise( (resolve, reject) => {
        var calendars_list = {};
        calendar.calendarList.list()
            .then(resp => {
                //console.log(resp.data.items);
                calendars_list = resp.data.items;
                // Create list of calendars owned by user
                var own_cal_ids = [];
                //var otto_cal_ID = '';
                for (var key in Object.keys(calendars_list)) {
                    if (calendars_list[key].accessRole == 'owner') {
                        // Push to list that can be ported to Calendar API freebusy query
                        var id_obj = {"id": calendars_list[key].id};
                        //own_cal_ids.push(calendars_list[key].id);
                        own_cal_ids.push(id_obj);
                        //console.log('calendar: ' + calendars_list[key].summary + '; id: ' + calendars_list[key].id + '\n');
                    }
                    /* No longer using ottoPlan calendar to reduce permissions
                    // Search for existing ottoPlan calendar
                    if (calendars_list[key].summary == 'ottoPlan Meetings') {
                        otto_cal_ID = calendars_list[key].id;
                    }
                    */
                }

                getOwnBusy(auth, own_cal_ids, all_busy, request_data)
                    .then(event_info => {
                        //console.log('\ngetOwnCal event_info: ' + JSON.stringify(event_info) + '\n');
                        resolve(event_info);
                    })
                    .catch(err => {
                        reject(err);
                    })
            }).catch(err => {
                console.log(err.message, '\n');
            });
    });

}


// Creates list of owned events using start/end time in request_data
// Calls createEvent to schedule the event
async function getOwnBusy(auth, own_cal_ids, all_busy, request_data) {
    const calendar = google.calendar({version: 'v3', auth});

    /* No longer creating/using ottoPlan calendar to reduce permissions
    // If no ottoPlan calendar, create one
    if (otto_cal_ID == '') {
        otto_cal_ID = await createCal(auth)
    }
    */

    console.log('Fetching user\'s busy times from Calendar API...\n');
    //console.log('own_cal_ids: ' + own_cal_ids + '\n');
    //console.log('request_data.start_time' + request_data.start_time, '\n');
    //console.log('request_data.end_time' + request_data.end_time, '\n');
    //console.log('request_data: ' + JSON.stringify(request_data), '\n');

    return new Promise( (resolve, reject) => {
        calendar.freebusy.query({
            auth: auth,
            headers: {"content-type": "application/json" },
            resource:{
                items: own_cal_ids,
                timeMin: request_data.start_time,
                // TODO: fix timeMin call when form is sent correctly from frontEnd
                //timeMin: request_data.scheduling_info.start.dateTime,
                //timeMax: request_data.scheduling_info.end.dateTime,
                timeMax: request_data.end_time,
                
                // Compiling the list of busy times all in UTC to account for possible variety of time zones accross all calendars
                // To request return data in PST instead of UTC:
                // timeZone: "-0800"
            }
        })
            .then(busy_times => {
                console.log('Response from Calendar API: ' + JSON.stringify(busy_times) + '\n');

                // TODO: this
                // Merge user busy_times with all_busy and return the new all_busy

                /*
                createEvent(auth, request_data)
                    .then(function(event) {
                        //console.log('getOwnBusy event: ' + JSON.stringify(event));
                        resolve(event);
                    })
                    .catch(err => {
                        reject(err);
                    })
                */
                
            }).catch(err => {
                reject('Error contacting Calendar API: ' + err);
            });
    
    /* TODO: remove all this once it's definitely useless
        var own_events = [];
        // Honestly, I don't understand why 'i' makes everything work, but it does.
        // I tried replacing it with 'key', but that made everything blow up
        var i = 0;
        for (var key in Object.keys(own_cal_ids)) {
            //console.log('(in loop) Calendar: ' + JSON.stringify(own_cal_ids[key]), '\n');


            calendar.events.list({
                calendarId: own_cal_ids[key],
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
                //console.log('i = ' + i + '; Object.keys(own_cal_ids).length = ' + Object.keys(own_cal_ids).length, '\n');
                if (err) {
                    //return console.log('The API returned an error: ' + err, '\n');
                    reject('The API returned an error: ' + err);
                }
                const events = res.data.items;

                if (events.length) {
                    //console.log('Upcoming events betweeen ' + request_data.scheduling_info.start.dateTime + ' and ' + request_data.scheduling_info.end.dateTime + ':');
                    //console.log('Upcoming events betweeen ' + request_data.start_time + ' and ' + request_data.end_time + ':');
                    events.map((event, key) => {
                        own_events.push(event);
                        //const start = event.start.dateTime || event.start.date;
                        //const end = event.end.dateTime || event.end.date;
                        //console.log(`${start}-${end} - ${event.summary}\n`);
                    });
                } else {
                    //console.log('No upcoming events found.\n');
                }

                i++;
                // Call next function when all calendars iterated through
                if (i == Object.keys(own_cal_ids).length) {
                    console.log('Calling createEvent...\n');

                    /*
                    // If DNE, populate with already-sorted first calendar
                    if (!Array.isArray(all_busy)) {
                        all_busy = [];
                        all_busy.concat(own_cal_ids);
                    }
                    /* Sort all_busy
                     * Compares 
                     * Compare times in unixTime format
                     */
                    // TODO: verify that it's safe to use Date.parse() in the backend
                    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
                    /*
                    else {
                        // TODO: do this for merge list
                        //var all_busy = function(all_busy, own_cal_ids) {

                    }
                    */
        /*
                    
                    // TODO: adjust this function call which doesn't need 'own_events'
                    createEvent(auth, own_events, request_data)
                        .then(function(event) {
                            //console.log('getOwnBusy event: ' + JSON.stringify(event));
                            resolve(event);
                        })
                        .catch(err => {
                            reject(err);
                        })
                }
            });
        }
        */
    });

    // Add info for time to schedule the event
    //request_data[eventStart] = 
    //request_data[eventEnd] = 

}

async function createEvent(auth, request_data) {
    console.log('Creating event using Calendar API...\n');

    //console.log(own_events);
    const calendar = google.calendar({version: 'v3', auth});
    var new_event = {
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
            //timeZone: 'America/Los_Angeles'
            //timeZone: request_data.scheduling_info.time_zone
        },
        end: {
            dateTime: request_data.end_time,
            //timeZone: 'America/Los_Angeles'
            // timeZone: request_data.scheduling_info.time_zone
        },
        // TODO: Importing emails from request_data isn't working right now because it's coming in as a list of email addresses, but we need it as an object in the format below
        //attendees: request_data.email,
        attendees: [
            { email: 'ewong012@ucr.edu'}, 
            { email: 'dsiv001@ucr.edu' }
        ],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 60 },
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 10 }
            ]
        }
    };

    // Return a promise in order to wait before sending back
    // This is the magic that made my hair turn grey
    // shoutout to this man who saved my life: https://stackoverflow.com/a/44735241
    console.log('Using temporary ottoPlan calendar for testing\n');
    return new Promise(function(resolve, reject) {
        calendar.events.insert(
            {
                auth: auth,
                //calendarId: otto_cal_ID,
                // TODO: remove this and change back to primary when done with testing
                calendarId: 'aa2ab10qanobloa2g9eqh7i50o@group.calendar.google.com',
                //calendarId: 'primary',
                resource: new_event,
                sendNotifications: true,
            },
            function(err, created_event) {
                if (err) {
                    console.log('Error creating Calendar event: ' + err, '\n');
                    //TODO: remove this
                    //event.success = "false";
                    //event.msg = err;
                    console.log('createEvent returning failure...\n');
                    reject(err);
                }
                console.log('Event created: %s', created_event.data.htmlLink, '\n');

                //created_event.success = "true";
                //console.log('createEvent event: ' + JSON.stringify(created_event), '\n');

                console.log('createEvent returning success...\n');
                resolve(created_event);
            }
        );
    });
}

// Replaces Date.parse() to convert RFC3339 format date/time to unix timestamp
// https://stackoverflow.com/a/11318669
function parseDate(rfc_in) {
    var m = googleDate.exec(d);
    var year   = +m[1];
    var month  = +m[2];
    var day    = +m[3];
    var hour   = +m[4];
    var minute = +m[5];
    var second = +m[6];
    var msec   = +m[7];
    var tzHour = +m[8];
    var tzMin  = +m[9];
    var tzOffset = new Date().getTimezoneOffset() + tzHour * 60 + tzMin;

    return new Date(year, month - 1, day, hour, minute - tzOffset, second, msec);
}

// Given two times, returns true if time1 is earlier than time2
function startsEarlier(time1, time2) {
    if(parseDate(time1) <= parseDate(time2)) {
        return true;
    }
    else {
        return false;
    }
}

// Given a length of time in 00h:00m format, return length in seconds
function toSec(duration) {
    var secs = duration.hr * 3600;
    secs += duration.min * 60;
    return secs;
}

// Given an end time, start time, and a duration return true if gap is >= duration
// Convert times to unix timestamp and get their difference (given in s)
// Convert duration to s and compare; if duration >= difference, return true
function gapOkay(end_first, start_next, duration) {
    gap_length = parseDate(end_first) - parseDate(start_next);
    dur_sec = toSec(duration);

    if (dur_sec >= gap_length) {
        return true;
    }
    else {
        return false;
    }
}

/* Merges user's busy times into all_busy
 * Accepts the duration of the goal event so that any too-short gaps between existing events that does not get saved as a valid block
 */
function merge_busy(all_busy, user_busy, duration) {
    var new_busy = [], i = 0, j = 0;

    while (i < all_busy.length && j < user_busy.length) {
        // If a busy period start time is after the previous busy period's end time
        // AND the busy period's end time is before the next busy period's start time
        // AND the gap length >= duration, push the event
        if (startsEarlier(all_busy[i].end_time, user_busy.start_time) && startsEarlier(a

        // all_busy[i] starts before or at same time as user_busy[j]
        if (startsEarlier(all_busy[i].start_time, user_busy[j].start_time) {
            
            // Case 1: busy windows don't overlap
            // Check that all_busy[i].end_time is before or at same time as user_busy[j].start_time
            // TODO: if the next event starts at the same time the previous one ends, combine busy periods and don't waste time calculating gap duration
            if (startsEarlier(all_busy[i].end_time, user_busy[j].start_time)) {
                
                // If gap between times is >= duration, save all_busy[i]
                // (Don't push user_busy[j] yet; need to check if it overlaps with next all_busy event first)
                if (gapOkay(all_busy[i].end_time, user_busy[j].start_time, duration)) {
                    new_busy.push(all_busy[i++]);
                }

                // Gap is not long enough; combine busy periods and push
                else {
                    all_busy[i].end_time = user_busy[j++].end_time;
                    new_busy.push(all_busy[i++]);
                }
            }
            
            // Case 2: periods overlap (potentially completely)
            // Store period with earlier start time and edit to have later end time if necessary
            // all_busy[i] starts before or at same time as user_busy[j]
            else {
                
            }
        }
        else {

        }

        // If a busy1 starts after busy2 and ends before busy2, discard busy1
        if (startsEarlier(all_busy[i].start_time, user_busy.start_time) && startsEarlier(all_busy[i].end_
        
        // Determine where to place event
        if (startsEarlier(all_busy[i].start_time, user_busy[j].start_time) {

        // Case 1: busy windows don't overlap
        // Check if new available window < duration
        // If not, add new busy window
        // Else edit existing busy window to include new event AND too-short gap
        if (startsEarlier(all_busy[i].end_time, user_busy[j].start_time))
        
        // Case 2: One event is engulfed by the other
        // Store only the engulfing event
        
        // Case 3: busy windows overlap
        // Longer event absorbs the other event to result in a single event that covers both busy times
        // Check if length between preceeding and following busy times is < duration
        // If gap < duration, events are combined into one to include the too-short gap

        if (compare_date(all_busy[i], user_busy[j]) > 0) {
            new_busy.push(user_busy[j++]);
        } else {
            new_busy.push(all_busy[i++]);
        }
    }

    // If user_busy still has elements, concatenate them to the end of the new all busy array
    if (j < user_busy.length) {
        new_busy = new_busy.concat(user_busy.slice(j));
    } else {
        new_busy = new_busy.concat(all_busy.slice(i));
    }

    return new_busy;
}

/* Compares the start/end dates of 2 event objects
 * If startTime are the same, 
function compare_date(date1, date2) {
    if (
    return a - b;
}
 */

/* No longer creating ottoPlan calendar
 * Use of this would require changing scope from 'https://www.googleapis.com/auth/calendar.events' to 'https://www.googleapis.com/auth/calendar.events'
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
