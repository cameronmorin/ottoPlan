const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
const asyncHandler = require('express-async-handler');

const port = 5000;

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
async function authorize(credentials, tokens, callback, request_data, all_busy) {
    console.log('authorize begin\n');
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    return new Promise( (resolve, reject) => {
        oAuth2Client.setCredentials({refresh_token: tokens.refresh_token, access_token: tokens.access_token});
        callback(oAuth2Client, request_data, all_busy)
            .then(response => {
                resolve(response);
            })
            .catch(err => {
                reject(err);
            })
    })
}

app.listen(port, () => console.log(`Server started on port ${port}\n`));

// Receive JSON scheduling request info from frontend
// Send back JSON scheduling response to frontend
// Utilizes a chain of functions that call each other
app.post('/schedule_event', asyncHandler(async (req, res) => {
    console.log('req.body: ' + JSON.stringify(req.body, null, 2) + '\n');

    fs.readFile('credentials.json', (err, content) => {
        if (err) res.json('Error loading client secret file:', err, '\n');
        //console.log('typeof content: ' + typeof content + '\n');
        //console.log('content: ' + content + '\n');
        //res.json(JSON.parse(content));
        console.log('Calling scheduleEvent\n');

        scheduleEvent(req.body, JSON.parse(content))
            .then(event_info => {
                console.log('Sending event_info back to frontend...');
                res.json(event_info);
            })
            .catch(err => {
                console.log('Sending failure back to frontend...', err);
                // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418
                var reply = { status: '418' , statusText: err }
                res.json(reply);
            })
    });
}));

/* Loops through list of attendees and calls functions to populate all_busy
 * Then calls functions to find time and schedule if possible
 * returns event info from scheduled event (or failure)
 * Calls getOwnCal which returns a JSON of the user's own events
 */
// TODO: remove this if unnecessary OR utilize it to manage multiple users' calendars
async function scheduleEvent(request_data, credentials) {

    return new Promise( (resolve, reject) => {

        getAllBusy(credentials, request_data)
            .then(all_busy => {
                // Makes the call to find a good time gap and book the actual event
                if (all_busy.length > 1) {
                    console.log('Calling findWindow\n');

                    authorize(credentials, request_data.schedule_info.organizer.tokens, findWindow, request_data, all_busy)
                        .then(event => {
                            console.log('Scheduled event: ' + JSON.stringify(event));//, null, 2));
                            resolve(event);
                        })
                        .catch(err => {
                            reject('Failed to find event window: ' + err);
                        })
                }
                else {
                    reject('No available times found.');
                }
            }).catch(err => {
                reject(err);
            })
    })
}

async function getAllBusy(credentials, request_data) {
    return new Promise( (resolve, reject) => {
        var all_busy = [];
        all_busy = workingHours(request_data);
        console.log('complete workingHours all_busy in getAll: ' + JSON.stringify(all_busy) + '\n');

        var i = 0;
        // Note: this can't be done in a for loop because of the return new Promise above
        // GOD BLESS THIS PERSON: https://stackoverflow.com/a/21185103
        (function next(i) {
            console.log('in function next; i = ' + i + '\n');
            if (i === request_data.event_info.attendees.length) {
                authorize(credentials, request_data.schedule_info.organizer.tokens, getOwnCal, request_data, all_busy)
                    .then(new_all_busy => {
                        all_busy = JSON.parse(JSON.stringify(new_all_busy));
                        console.log('FULL all_busy: ' + JSON.stringify(all_busy, null, 2) + '\n');
                        resolve(all_busy);
                    })
                    .catch(err => {
                        reject('Failed to access busy info of organizer: ' + err);
                    })
            }

            else {
                console.log('request_data.event_info.attendees[i].tokens: ' + JSON.stringify(request_data.event_info.attendees[i].tokens, null, 2));

                authorize(credentials, request_data.event_info.attendees[i].tokens, getOwnCal, request_data, all_busy)
                    .then(new_all_busy => {
                        all_busy = JSON.parse(JSON.stringify(new_all_busy));
                        next(++i);
                    })
                    .catch(err => {
                        console.log('Failed during gathering of users\' busy times');
                        reject(err);
                    })
            }
        })(0);
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
async function getOwnCal(auth, request_data, all_busy) {
    //console.log('getOwnCal request_data: ' + JSON.stringify(request_data, null, 2) + '\n');
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
                }

                getOwnBusy(auth, own_cal_ids, request_data, all_busy)
                    .then(event_info => {
                        //console.log('\ngetOwnCal event_info: ' + JSON.stringify(event_info, null, 2) + '\n');
                        resolve(event_info);
                    })
                    .catch(err => {
                        reject('getOwnBusy failed: ' + err);
                    })
            }).catch(err => {
                console.log(err.message, '\n');
            });
    });

}

// Creates list of owned events using start/end time in request_data
// Calls createEvent to schedule the event
async function getOwnBusy(auth, own_cal_ids, request_data, all_busy) {
    const calendar = google.calendar({version: 'v3', auth});
    console.log('Fetching user\'s busy times from Calendar API...\n');

    return new Promise( (resolve, reject) => {
        calendar.freebusy.query({
            auth: auth,
            headers: {"content-type": "application/json" },
            resource:{
                items: own_cal_ids,
                timeMin: request_data.schedule_info.start_date,
                timeMax: request_data.schedule_info.end_date
                // Compiling the list of busy times all in UTC to account for possible variety of time zones accross all calendars
                // To request return data in PST instead of UTC:
                // timeZone: "-0800"
            }
        })
            .then(busy_times => {
                //console.log('Response from Calendar API: ' + JSON.stringify(busy_times, null, 2) + '\n');
                duration = request_data.schedule_info.duration;
                var user_busy = [];

                /* busy_times comes back as a response body that contains each calendar's busy times as a list of objects with start and end
                 * The lists of busy times needs to be merged into user_busy
                 * user_busy populated by merging each calendar's list of busy times one by one
                 */
                // Each calendar's events must be pre-processed to remove too-short gaps
                var cal_busy = [];
                var i;
                for(i = 0; i < own_cal_ids.length; i++) {
                    var curr_id = own_cal_ids[i].id;
                    if (busy_times.data.calendars[curr_id].busy.length > 0) {
                        cal_busy = [];
                        //console.log('pre-processing for ' + curr_id + '\n');
                        cal_busy = merge_busy(cal_busy, busy_times.data.calendars[curr_id].busy, duration);
                        //console.log('cal_busy[' + curr_id + ' = ' + i + ']: ' + JSON.stringify(cal_busy, null, 2) + '\n');
                        user_busy = merge_busy(user_busy, cal_busy, duration);
                    }
                    //console.log('user_busy after[' + curr_id + ' = ' + i + ']: ' + JSON.stringify(user_busy, null, 2) + '\n');
                }
                console.log('Complete busy times for user: ' + JSON.stringify(user_busy, null, 2) + '\n');


                // TODO: this
                // Merge user busy_times with all_busy and return the new all_busy
                all_busy = merge_busy(all_busy, user_busy, duration);
                //console.log('getOwnBusy all_busy: ' + JSON.stringify(all_busy, null, 2) + '\n');

                resolve(all_busy);
            }).catch(err => {
                reject('Error contacting Calendar API: ' + err);
            });
    });
}
async function findWindow(auth, request_data, all_busy) {
    return new Promise(function(resolve, reject) {
        // Start at beginning of request_data.start_time request.data.work_time
        // Don't look for times outside of working hours (and in the future outside of working days)

        // Hard-coding saturday and sunday as non-working days
        // Hard-coding 9-5 as working hours

        var search_start = parseDate(request_data.schedule_info.start_date);
        var duration = request_data.schedule_info.duration;
        var i = 0;
        var time_found = false;
        console.log('in findWindow\n');

        while (i < all_busy.length) {

            console.log('Loop #' + i + ':\n\tsearch_start: ' + search_start + '\n');
            console.log('\tsearch_start.getDay(): ' + search_start.getDay() + '\n');
            console.log('\tsearch_start.getHours(): ' + search_start.getHours() + '\n');

            if (gapOkay(search_start, parseDate(all_busy[i].start), duration)) {
                
                var end_time = new Date();
                end_time.setTime(search_start.getTime() + toMSec(duration));

                console.log('end_time.getHours(): ' + end_time.getHours() + '\n');
                
                // Check if end_timeis outside of working hours
                if (end_time.getHours() > 17 || end_time.getTime() > parseDate(request_data.schedule_info.end_date).getTime()) {
                    console.log('Ends outside of working hours or search window: ' + end_time.getHours() + '\n');
                    search_start = parseDate(all_busy[i++].end);
                    continue;
                }

                // Time found; break to call createEvent
                request_data.event_start = ISODateString(search_start);
                console.log('request_data.event_start: ' + request_data.event_start);
                request_data.event_end = ISODateString(end_time);
                console.log('request_data.event_end: ' + request_data.event_end + '\n');

                time_found = true;
                break;
            }

            // Keep looking for available meeting time
            else {
                search_start = parseDate(all_busy[i++].end);
            }
        }

        if (time_found) {
            console.log('findWindow calling createEvent\n');
            createEvent(auth, request_data)
                .then(function(event) {
                    //console.log('getOwnBusy event: ' + JSON.stringify(event, null, 2));
                    resolve(event);
                })
                .catch(err => {
                    reject('findWindow failure: ' + err);
                })
        }
        else {
            reject('No available time found');
        }
    });
    console.log('Ending findWindow...\n');
}

/* Converts a Date object to RFC 3339 format
 * https://stackoverflow.com/a/7244288
*/
function ISODateString(d){
     function pad(n){return n<10 ? '0'+n : n}
     return d.getUTCFullYear()+'-'
          + pad(d.getUTCMonth()+1)+'-'
          + pad(d.getUTCDate())+'T'
          + pad(d.getUTCHours())+':'
          + pad(d.getUTCMinutes())+':'
          + pad(d.getUTCSeconds())+'Z'
}

async function createEvent(auth, request_data) {
    console.log('Creating event using Calendar API...\n');
    var attendee_emails = [];
    var i;
    // Create a list of objects containing the attendees' emails
    for (i = 0; i < request_data.event_info.attendees.length; i++) {
        var email = {email: request_data.event_info.attendees[i].email};
        attendee_emails.push(email);
    }
    console.log('attendee_emails: ' + JSON.stringify(attendee_emails, null, 2) + '\n');

    //console.log(own_events);
    const calendar = google.calendar({version: 'v3', auth});
    var new_event = {
        summary: request_data.event_info.summary,
        location: request_data.event_info.location,
        description: request_data.event_info.description,
        start: {
            dateTime: request_data.event_start,
            //timeZone: 'America/Los_Angeles'
            //timeZone: request_data.scheduling_info.timezone
        },
        end: {
            dateTime: request_data.event_end,
            //timeZone: 'America/Los_Angeles'
            // timeZone: request_data.scheduling_info.timezone
        },
        attendees: attendee_emails,
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
                calendarId: 'primary',
                resource: new_event,
                //sendNotifications: false,
                sendNotifications: true,
            },
            function(err, created_event) {
                if (err) {
                    console.log('Error creating Calendar event: ' + err, '\n');
                    reject('createEvent returning failure...\n' + err);
                }
                console.log('Event created: %s', created_event.data.htmlLink, '\n');

                console.log('createEvent returning success...\n');
                resolve(created_event);
            }
        );
    });
}

// Convert RFC 3339 format string into Date object in UTC
function parseDate(rfc_in) {
    // Example rfc_in: 2020-02-22T01:00:00Z
    //console.log('rfc_in: ' + rfc_in);

    var date = new Date();
    var split_rfc = rfc_in.split('T');

    // Split date into year, month, day
    var split_date = split_rfc[0].split('-');

    // Removes 'Z' from end
    var time = split_rfc[1].replace('Z', "");
    time = time.split(':');

    date.setUTCFullYear(parseInt(split_date[0]));
    // months are from 0-11 NOT THE MORE INTUITIVE 1-12
    date.setUTCMonth(parseInt(split_date[1]) - 1);
    //date_obj.month = split_date[1];

    // date doesn't start at 0
    date.setUTCDate(parseInt(split_date[2]));
    //date_obj.day = split_date[2];
    date.setUTCHours(parseInt(time[0]));
    //date_obj.hour = time[0];
    date.setUTCMinutes(parseInt(time[1]));
    //date_obj.min = time[1];
    date.setUTCSeconds(parseInt(time[2]));
    //date_obj.sec = time[2];

    //console.log('date: ' + date.toUTCString() + '\n');
    return date;
}

// Given a length of time in 00h:00m format, return length in milliseconds
function toMSec(duration) {
    var split_dur = duration.split(':');
    var hour = parseInt(split_dur[0]);
    var min = parseInt(split_dur[1]);

    var millisec = hour * 60 * 60 * 1000;
    millisec += min * 60 * 1000;

    return millisec;
}

// Populates an array to block out non-working hours
// TODO: adjust this to handle time zones (only using user's browser's time zone for now)
function workingHours(request_data) {
    console.log('Start of workingHours\n');

    var working_hours = [];

    // Must set milliseconds to 0 otherwise it defaults to some non-zero value
    console.log('start_date: ' + request_data.schedule_info.start_date + '\n');
    var search_start = parseDate(request_data.schedule_info.start_date);
    search_start.setMilliseconds(0);
    console.log('search_start: ' + search_start + '\n');
    var end_date = new Date(parseDate(request_data.schedule_info.end_date));
    console.log('end_date: ' + end_date + '\n');
    end_date.setMilliseconds(0);

    // If the end_date is not blocked out, create a block for it at the end
    var end_blocked = false;
    var i = 0;
    while (new Date(search_start).getTime() < new Date(end_date).getTime()) {
        //console.log('-------------------\nwhile loop #' + i + '\n');
        //console.log('search_start: ' + search_start + '\n');
        i++;
        

        var nonwork_start = new Date();
        nonwork_start.setTime(search_start.getTime());
        var nonwork_end = new Date();
        nonwork_end.setTime(search_start.getTime());

        // Starting at the start_time date, create blocks of busy time for non-working hours
        // Create blocks of busy times using non-working days
        // TODO: adjust this to use user's specifications
        //
        // If within Friday after 9am - Sunday, create new busy block until Monday @ 9am or end of search window (whichever is first)
        //console.log('getDay() = ' + search_start.getDay() + '; getHours() = ' + search_start.getHours());

        if (search_start >= parseDate(request_data.schedule_info.end_date)) {
            //console.log('start >= end_date\n');
            search_start.setTime(parseDate(request_data.schedule_info.end_date));
            search_start.setMilliseconds(0);
            nonwork_end.setTime(end_date.getTime());
            nonwork_end.setMilliseconds(0);
            break;
        }

        else if (search_start.getDay() == 0 || search_start.getDay() == 6 || (search_start.getDay() == 5 && search_start.getHours() >= 9)) {
            //console.log('Weekend: ' + search_start.getDay() + '\n');

            // If the start of the search window is on a Friday within working hours, set the start of the block to be end of day Friday
            if (search_start.getDay() == 5 && search_start.getHours() < 17) {

                nonwork_start.setHours(17);
                nonwork_start.setMinutes(0);
                nonwork_start.setSeconds(0);
                nonwork_start.setMilliseconds(0);
            }
            //console.log('nonwork_start: ' + nonwork_start.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}) + '\n');


            // Set the end to the next Monday (https://stackoverflow.com/a/33078673)
            nonwork_end.setDate(search_start.getDate() + ((1 + 7 - search_start.getDay()) % 7));
            nonwork_end.setHours(9);
            //console.log('nonwork_end: ' + nonwork_end.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}) + '\n');

        }
        // Block out non-working hours of working days (Mon - Thurs)
        else {
            //console.log('Weekday: ' + search_start.getDay() + '\n');
            // If the start of the search window is outside of working hours, create a new block until 9am
            // Don't need to adjust the start of the search window
            if (search_start.getHours() < 9) {
                //console.log('search_start.getHours() < 9\n');
                nonwork_end.setHours(9);
                nonwork_end.setMinutes(0);
                nonwork_end.setSeconds(0);
                nonwork_end.setMilliseconds(0);
            }
            // Don't create an end-of-day busy window after search window
            else if (search_start.getDay() < end_date.getDay()) {
                //console.log('search_start.getHours() >= 9\n');
                // Set start of window to be 5pm of current day
                nonwork_start.setHours(17);
                nonwork_start.setMinutes(0);
                nonwork_start.setSeconds(0);
                nonwork_start.setMilliseconds(0);

                // Set end of window to next day
                nonwork_end.setDate(nonwork_end.getDate() + 1);
                nonwork_end.setHours(9);
                nonwork_end.setMinutes(0);
                nonwork_end.setSeconds(0);
                nonwork_end.setMilliseconds(0);
            }
            else {
                break;
            }

        }

        //console.log('Checking if next working day is before end of search window\n');

        // If the next working day is after the end of the search window, just set it to the end of the search window
        if (nonwork_end > parseDate(request_data.schedule_info.end_date)) {
            nonwork_end.setTime(end_date.getTime());
            nonwork_end.setMilliseconds(0);
            end_blocked = true;
        }
        //console.log('nonwork_start: ' + nonwork_start + '\n');
        //console.log('nonwork_end: ' + nonwork_end + '\n');

        var block_day = {
            start: ISODateString(nonwork_start),
            end: ISODateString(nonwork_end)
        }

        //console.log('block_day: ' + JSON.stringify(block_day, null, 2) + '\n');

        working_hours.push(block_day);
        search_start.setTime(nonwork_end.getTime());
        search_start.setMilliseconds(0);
    }

    if (!end_blocked) {
        var block_day = {
            start: request_data.schedule_info.end_date,
            end: request_data.schedule_info.end_date
        }
        working_hours.push(block_day);
    }

    console.log('Complete working_hours: ' + JSON.stringify(working_hours, null, 2) + '\n');
    return working_hours;
}

// Given an end time, start time, and a duration return true if gap is >= duration
// Convert times to unix timestamp and get their difference (given in s)
// Convert duration to s and compare; if duration >= difference, return true
function gapOkay(end_first, start_next, duration) {
    var dur_time = toMSec(duration);

    if (Math.abs(end_first - start_next) >= dur_time) {
        //console.log('gapOkay; length = ' + Math.abs(end_first - start_next) + '; duration(ms) = ' + dur_time + '\n');
        return true;
    }
    else {
        //console.log('gapNotOkay; length = ' + Math.abs(end_first - start_next) + '; duration(ms) = ' + dur_time + '\n');
        return false;
    }
}

/* Merges user's busy times into all_busy
 * Accepts the duration of the goal event so that any too-short gaps between existing events that does not get saved as a valid block
 */
function merge_busy(all_busy, user_busy, duration) {
    var new_busy = [], i = 0, j = 0;

    //console.log('merge_busy all_busy: ' + JSON.stringify(all_busy, null, 2) + '\n');
    //console.log('merge_busy user_busy: ' + JSON.stringify(user_busy, null, 2) + '\n');

    var dur_time = new Date();

    while (i < all_busy.length && j < user_busy.length) {

        var all_busy_start = parseDate(all_busy[i].start);
        var all_busy_end = parseDate(all_busy[i].end);
        var user_busy_start = parseDate(user_busy[j].start);
        var user_busy_end = parseDate(user_busy[j].end);

        // all_busy[i] starts before or at same time as user_busy[j]
        if (all_busy_start < user_busy_start) {
        //if (startsEarlier(all_busy[i].start, user_busy[j].start)) {
            
            // Case 1: busy windows don't overlap
            // Check that all_busy[i].end is before or at same time as user_busy[j].start
            if (all_busy_end < user_busy_start) {
            //if (startsEarlier(all_busy[i].end, user_busy[j].start)) {
                
                // If gap between times is >= duration, push all_busy[i]
                // (Don't push user_busy[j] yet; need to check if it overlaps with next all_busy event first)
                if (gapOkay(all_busy_end, user_busy_start, duration)) {
                    //console.log('Gap ok; \n\tall_busy_end = ' + all_busy_end);
                    //console.log('\tuser_busy_start = ' + user_busy_start + '\n');
                    new_busy.push(all_busy[i++]);
                }

                // Gap is not long enough; combine busy periods into element with later end time
                // Increment earlier end time array 
                // Don't push combined event yet in case overlaps with next event
                else {
                    //console.log('Gap not ok; \n\tall_busy_end = ' + all_busy[i].end);
                    //console.log('\tuser_busy[j].end = ' + user_busy[j].end);
                    all_busy[i].end = user_busy[j++].end;
                    //console.log('new all_busy[j].end = ' + all_busy[i].end + '\n');

                    //new_busy.push(all_busy[i++]);
                }
            }
            
            // Case 2: periods overlap (potentially completely)
            // Store period with later start time and edit to have earlier start time
            // Discard the period with the earlier end time (increment)
            // and don't push the event with the later end time in order to calculate next gap/overlap
            //  (This is in case there is a series of overlapping events; the one that ends later cannot be from the same array as the next overlapping event)
            else {
                // all_busy[i] starts before or at same time as user_busy[j]
                // Determine which end is later
                if (all_busy_end < user_busy_end) {
                    // user_busy ends later; edit start time and increment all_busy
                    //console.log('periods overlap\n\tuser_busy[j].start = ' + user_busy_start);
                    //console.log('\tall_busy[i].start = ' + all_busy[i].start);

                    user_busy[j].start = all_busy[i++].start;

                    //console.log('new user_busy[j].start = ' + user_busy[j].start + '\n');
                }

                // all_busy[i] starts earlier and ends later; discard user_busy[j]
                else {
                    j++;
                }
            }
        }


        // user_busy[j] starts before or at same time as all_busy[i]
        else {
            // Case 1: busy windows don't overlap
            // Check that user_busy[j].end is before or at same time as all_busy[i].start
            if (user_busy_end < all_busy_start) {
            //if (startsEarlier(user_busy[j].end, all_busy[i].start)) {
                
                // If gap between times is >= duration, push user_busy[j]
                // (Don't push all_busy[i] yet; need to check if it overlaps with next all_busy event first)
                if (gapOkay(user_busy_start, all_busy_end, duration)) {
                    //console.log('Available slot from ' + user_busy[j].end + ' to ' + all_busy[i].start + '\n');
                    //console.log('Gap ok; \n\tuser_busy[j].end = ' + user_busy[j].end);
                    //console.log('\tall_busy[i].end = ' + all_busy[i].end + '\n');
                    new_busy.push(user_busy[j++]);
                }

                // Gap is not long enough; combine busy periods into element with later end time
                // Increment earlier end time array 
                // Don't push combined event yet in case overlaps with next event
                else {
                    //console.log('Gap not ok; \n\tuser_busy[j].end = ' + user_busy[j].end);
                    //console.log('\tall_busy[i].end = ' + all_busy[i].end);
                    user_busy[j].end = all_busy[i++].end;
                    //console.log('new user_busy[j].end = ' + user_busy[j].end + '\n');
                }
            }
            
            // Case 2: periods overlap (potentially completely)
            // Store period with later start time and edit to have earlier start time
            // Discard the period with the earlier end time (increment)
            // and don't push the event with the later end time in order to calculate next gap/overlap
            //  (This is in case there is a series of overlapping events; the one that ends later cannot be from the same array as the next overlapping event)
            else {
                // user_busy[j] starts before or at same time as all_busy[i] 
                // Determine which end is later
                //console.log('periods overlap\n\tuser_busy[j].end = ' + user_busy[j].end);
                //console.log('\tall_busy[i].end = ' + all_busy[i].end);

                if (user_busy_end < all_busy_end) {
                //if (startsEarlier(user_busy[j].end, all_busy[i].end)) {
                    // all_busy ends later; edit start time and increment user_busy

                    all_busy[i].start = user_busy[j++].start;
                    //console.log('new all_busy[i].start = ' + all_busy[i].start + '\n');
                }

                // user_busy[j] starts earlier and ends later; discard all_busy[i] 
                else {
                    i++;
                    //console.log('fully engulfed; no changes\n');
                }
            }
        }
    }

    // If either array still has elements, remove too-short gaps and push
    if (j < user_busy.length) {

        while (j < user_busy.length - 1) {
            var user_busy_start = parseDate(user_busy[j].start);
            var user_busy_end = parseDate(user_busy[j].end);
            var next_busy_start = parseDate(user_busy[j + 1].start);

            if (gapOkay(user_busy_end, next_busy_start, duration)) {
                //console.log('Gap ok; \n\tuser_busy_end = ' + user_busy_end);
                //console.log('\tnext_start = ' + next_busy_start + '\n');

                new_busy.push(user_busy[j++]);
            }
            else {
                // consolidate the events and discard the first
                // Don't push second yet; must check for sufficient gap length
                //console.log('Gap not ok; \n\tuser_busy_end = ' + user_busy_end);
                //console.log('\tnext_busy_start = ' + next_busy_start + '\n');
                user_busy[j + 1].start = user_busy[j].start;
                j++;
            }
        }
        // Push the last element
        new_busy.push(user_busy[j]);
    } 
    else {
        /* Since all_busy is initially empty and is always built to avoid too-short gaps,
         *   don't need to perform these checks; just concatenate remaining contents */
        new_busy = new_busy.concat(all_busy.slice(i));
    }

    //console.log('endOf merge_busy new_busy: ' + JSON.stringify(new_busy, null, 2) + '\n');
    return new_busy;
}

/* No longer creating ottoPlan calendar
 * Use of this would require changing scope from 'https://www.googleapis.com/auth/calendar.events' to 'https://www.googleapis.com/auth/calendar.events'
// Creates a new ottoPlan calendar
async function createCal(auth) {
  const calendar = google.calendar({version: 'v3', auth});

// Retrieve time zone of primary calendar to set for new calendar
  var timezone = '';
  await calendar.calendars.get({
      calendarId: 'primary'
  })
    .then(resp => {
        //console.log(resp.data.timeZone, '\n');
        timezone = resp.data.timeZone;
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
          timeZone: timezone
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
