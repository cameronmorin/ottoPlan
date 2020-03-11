const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
const asyncHandler = require('express-async-handler');

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
async function authorize(credentials, tokens, callback, request_data, all_busy) {
    console.log('authorize begin\n');
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // No reject handled here because this won't be in the final code
    // Auth will be occuring in frontend
    return new Promise( (resolve, reject) => {

        //var i;
        //for (i = 0; i < 2; i++) {

        // rmail refresh token
        console.log('setting credentials');
        console.log('tokens: ' + JSON.stringify(tokens, null, 2));
        //console.log('tokens typeof: ' + typeof tokens + '\n');
        oAuth2Client.setCredentials({refresh_token: tokens.refresh_token, access_token: tokens.access_token});
        console.log('credentials set\n');
        callback(oAuth2Client, request_data, all_busy)
            .then(response => {
                resolve(response);
            })
            .catch(err => {
                reject('Failed to authorize: ' + err);
            })
    })



    /*
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            // This line is incorrect and will be unnecessary after auth is handled in frontend
            if (err) return getAccessToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));

            // Call scheduling function chain
            callback(oAuth2Client, request_data, all_busy)
                .then(event_info => {
                    //console.log('authorize event_info: ' + JSON.stringify(event_info, null, 2) + '\n');
                    resolve(event_info);
                })
                .catch(err => {
                    reject(err);
                })
        });
    });
    */
}

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
            fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), (err) => {
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
    console.log('req.body: ' + JSON.stringify(req.body, null, 2) + '\n');

    fs.readFile('credentials.json', (err, content) => {
        if (err) res.json('Error loading client secret file:', err, '\n');
        //console.log('typeof content: ' + typeof content + '\n');
        //console.log('content: ' + content + '\n');
        //res.json(JSON.parse(content));

        scheduleEvent(req.body, JSON.parse(content))
            .then(event_info => {
                console.log('Sending event_info back to frontend...');
                res.json(event_info);
            })
            .catch(err => {
                console.log('Sending failure back to frontend...');
                res.json(err);
            })
    });

    /*
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
                //console.log('post event_info: ' + JSON.stringify(event_info, null, 2) + '\n');
                console.log('Sending event_info back to frontend...');
                res.json(event_info);
            })
            .catch(err => {
                console.log('Sending failure back to frontend...');
                res.json(err);
            })
    });
    */

}));

/* Loops through list of attendees and calls functions to populate all_busy
 * Then calls functions to find time and schedule if possible
 * returns event info from scheduled event (or failure)
 * Calls getOwnCal which returns a JSON of the user's own events
 */
// TODO: remove this if unnecessary OR utilize it to manage multiple users' calendars
async function scheduleEvent(request_data, credentials) {
    //console.log('request_data: ' + JSON.stringify(request_data, null, 2), '\n');
    //console.log('request_data.start_time: ' + request_data.start_time, '\n');
    //console.log('typeof credentials: ' + typeof credentials + '\n');
    //console.log('credentials: ' + JSON.stringify(credentials) + '\n');

    //TODO: after attendees come in from frontend correctly, call workingHours from here instead of getAllBusy
    return new Promise( (resolve, reject) => {
            //console.log('scheduleEvent Promise begin\n');
        /*
        var attendees = [];
        // gmail token
        attendees.push('1//06ue5SnV-Ua2JCgYIARAAGAYSNwF-L9IrIbsANAwzjCyFRctMpX4eQnfWLpTRmH-3h6fu4nM0-nnRhVYvFzReBQ-hc-DeLp5a9d0');
        // rmail token
        attendees.push('1//06CQRedBAeU1bCgYIARAAGAYSNwF-L9Ir1jzPH6gzOViheTUTWrR_S4SYw_p61pv4yN3Ob1g3OKzn95y7Xx5t3sbmtWPdhT9ECGU');
        */
        //console.log('request_data.gmail_refresh_token: ' + request_data.gmail_refresh_token + '\n');
        //console.log('request_data.rmail_refresh_token: ' + request_data.rmail_refresh_token + '\n');
        //console.log('attendees[0]: ' + attendees[0] + '\n');
        //console.log('attendees[1]: ' + attendees[1] + '\n');

        // Initialize all_busy with non-working hours/days
        //console.log('Calling workingHours\n');
        var all_busy = [];
        all_busy = workingHours(request_data);
        //console.log('scheduleEvent all_busy after working hours: ' + JSON.stringify(all_busy, null, 2) + '\n');
        /*

        var i;
        // Populate all_busy using calendar info from all attendees
    const forLoop = async _ => {
        for (i = 0; i < attendees.length; i++) {
            console.log('for loop #' + i + '\n');
    //authorize(credentials, attendees[i], getOwnCal, request_data, all_busy)
    //TODO: implement attendees' refresh_token
    //    .then(new_all_busy => {
    //        all_busy = JSON.parse(JSON.stringify(new_all_busy));
    //    })
    //    .catch(err => {
    //        console.log('Failed during gathering of users\' busy times');
    //        reject(err);
    //    })
             try {
                 //TODO: implement attendees.refresh_token
                all_busy = await authorize(credentials, attendees[i], getOwnCal, requst_data, all_busy);
            } catch(err) {
                console.log('Sending failure back to frontend...');
                reject(err);
            }
        }
    }
    */

        getAllBusy(credentials, request_data)
            .then(all_busy => {
                // TODO: have attendees list include scheduler's refresh token
                // Have another field for "scheduler": refresh_token so it is booked in the right person's calendar

                // Makes the call to find a good time gap and book the actual event
                if (all_busy.length > 1) {

                    // TODO: extract the correct start time for the event
                    // add the duration to get the end time
                    // TODO: account for time zones
                    //request_data.work_start
                    //request_data.work_end
                    //request_data.event_start = all_busy[0].end;
                    //request_data.event_end = all_busy[1].start;
                    var attendees = [];
                    // gmail refresh token
                    //attendees.push('1//06ue5SnV-Ua2JCgYIARAAGAYSNwF-L9IrIbsANAwzjCyFRctMpX4eQnfWLpTRmH-3h6fu4nM0-nnRhVYvFzReBQ-hc-DeLp5a9d0');
                    //attendees.push('AEu4IL1OhPZpdF6PQ6TtaG8rm3ZLnv_7r6IuJGOXK8tAtU5PRcxVvsywMr1LisWqnhjITwprYVGE8nM3VhIAtj2pxLuARogddcIrbzhPJ29PefYU6nbUX6DEnjI9-0kwPgQUiEND8Qm6qMZ-z2CXTpk2df66NL2VUFUW7zZyroAp5BXtv-VEcgvAvFdQkudFPoyoC_aNHcEPAzqPzVyPuqlKJhZC2L34Dke008HJLp-oXhs75j7czf9-1iAKhOmChfHCU9D7b4r3csBoYMhMTKDFuCP3Ips6Wuv8B4as3PumUs9fPuSfUSF6jdwMboACMjxTJ_78fjIK_ueHY0mrSySnKkfgAEM9GVaXIWzRYir6HjfxVsE67j7S1WjC02S5xA-h6bIhOJpzsA6bEkzkse9WBXgoa_xpFyeZX5I1ZJCaCt3xXSQJn11EKLwaIdcIdcamPgatUlZd');
                    /*
                    var obj = {refresh: 'AEu3IL1OhPZpdF6PQ6TtaG8rm3ZLnv_7r6IuJGOXK8tAtU5PRcxVvsywMr1LisWqnhjITwprYVGE8nM3VhIAtj2pxLuARogddcIrbzhPJ29PefYU6nbUX6DEnjI9-0kwPgQUiEND8Qm6qMZ-z2CXTpk2df66NL2VUFUW7zZyroAp5BXtv-VEcgvAvFdQkudFPoyoC_aNHcEPAzqPzVyPuqlKJhZC2L34Dke008HJLp-oXhs75j7czf9-1iAKhOmChfHCU9D7b4r3csBoYMhMTKDFuCP3Ips6Wuv8B4as3PumUs9fPuSfUSF6jdwMboACMjxTJ_78fjIK_ueHY0mrSySnKkfgAEM9GVaXIWzRYir6HjfxVsE67j7S1WjC02S5xA-h6bIhOJpzsA6bEkzkse9WBXgoa_xpFyeZX5I1ZJCaCt3xXSQJn11EKLwaIdcIdcamPgatUlZd', access: 'ya29.a0Adw1xeUvRhny--RXO6FwZM1rB0gzLqG5r-lcfBpzeLUaD655NOnW5swe7RvllokRagw0BznTmUM_vNUQbNi-FvMG2bibSDLnyJEkwLMdPcwIcEQTykfCV6bf96r6NtXw_UowZjlEu6ITO4hb45n7Bxr2fQW7MY2qejCsbv7k51MjnOig'}
                    attendees.push(obj);
                    */
                    //attendees.push('AEu3IL0eJknM-ODSU0w36d4CdgB4-DA3oXom5FpaTqssIww-j4LF2ASw92mTP9JyO51uQ277DtMkc1NYakXk9PKPbXJCSzQ81FngKOiH7mXC34bO6DB45BXZXX80Dsnk_xn781xpmH62k8rlmmGEHgGa-apo8JxlJ-FUmTU0Q5y0fm6VZv5ygDwBaJoWwpykCjfj0GyFRm4OFILQ-JfZBCMiq266dEDYu2Fly-lrAtR4A2uyY4zITT-_891LNs-HzWexSF3feJlBTGnVWpzdmY8MUe51Y2Y0ugZeZtiyDaEu7cUx-dlR0QiALLvnjwuBBQIw9pGOwmkYHwwcgyOHjotOKmyBJDrUYgOgNqsVLl-BacRg6NWGToNTwXT_PFk5fmIfDIy7ltE8ZjmlayGe3zlkC1BxbKKnutiHivDqAEbg7tCIZU0X0yq4ZnmIpaxcDNVy1ywS_WwK');
                    //attendees.push(request_data.gmail_refresh_token);

                    console.log('Calling findWindow\n');

                    //TODO: figure out how to have it use the right auth info to create the event
                    // have attendees list include scheduler's refresh token
                    //TODO: implement scheduler_token
                    authorize(credentials, request_data.schedule_info.organizer.tokens, findWindow, request_data, all_busy)
                    //findWindow(auth, all_busy, request_data)
                        .then(event => {
                            console.log('Scheduled event: ' + JSON.stringify(event));//, null, 2));
                            resolve(event);
                        })
                        .catch(err => {
                            reject(err);
                        })
                }
                else {
                    reject('No available times found.');
                }
            }).catch(err => {
                reject(err);
            })
    }).catch(err => {
        reject(err);
    })


    /*
        getOwnCal(auth, all_busy, request_data)
            .then(event_info => {
                //console.log('scheduleEvent event_info: ' + JSON.stringify(event_info, null, 2) + '\n');
                resolve(event_info);
            })
            .catch(err => {
                reject(err);
            })
            */
            }

async function getAllBusy(credentials, request_data) {
    return new Promise( (resolve, reject) => {
        //var attendees = [];
        //attendees.push(request_data.gmail_refresh_token);
        //attendees.push(request_data.rmail_refresh_token);
        // TODO: remove this after attendees implemented in frontend
        // gmail token
        //attendees.push('1//06ue5SnV-Ua2JCgYIARAAGAYSNwF-L9IrIbsANAwzjCyFRctMpX4eQnfWLpTRmH-3h6fu4nM0-nnRhVYvFzReBQ-hc-DeLp5a9d0');
        // rmail token
        //attendees.push('1//06CQRedBAeU1bCgYIARAAGAYSNwF-L9Ir1jzPH6gzOViheTUTWrR_S4SYw_p61pv4yN3Ob1g3OKzn95y7Xx5t3sbmtWPdhT9ECGU');
        //var obj = {refresh: 'AEu4IL1OhPZpdF6PQ6TtaG8rm3ZLnv_7r6IuJGOXK8tAtU5PRcxVvsywMr1LisWqnhjITwprYVGE8nM3VhIAtj2pxLuARogddcIrbzhPJ29PefYU6nbUX6DEnjI9-0kwPgQUiEND8Qm6qMZ-z2CXTpk2df66NL2VUFUW7zZyroAp5BXtv-VEcgvAvFdQkudFPoyoC_aNHcEPAzqPzVyPuqlKJhZC2L34Dke008HJLp-oXhs75j7czf9-1iAKhOmChfHCU9D7b4r3csBoYMhMTKDFuCP3Ips6Wuv8B4as3PumUs9fPuSfUSF6jdwMboACMjxTJ_78fjIK_ueHY0mrSySnKkfgAEM9GVaXIWzRYir6HjfxVsE67j7S1WjC02S5xA-h6bIhOJpzsA6bEkzkse9WBXgoa_xpFyeZX5I1ZJCaCt3xXSQJn11EKLwaIdcIdcamPgatUlZd', access: 'ya29.a0Adw1xeUvRhny--RXO6FwZM1rB0gzLqG5r-lcfBpzeLUaD655NOnW5swe7RvllokRagw0BznTmUM_vNUQbNi-FvMG2bibSDLnyJEkwLMdPcwIcEQTykfCV6bf96r6NtXw_UowZjlEu6ITO4hb45n7Bxr2fQW7MY2qejCsbv7k51MjnOig'}
        //attendees.push(obj);
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
                    .then(all_busy => {
                        all_busy = JSON.parse(JSON.stringify(new_all_busy));
                        resolve(all_busy);
                    })
                    .catch(err => {
                        reject('Failed to access busy info of organizer: ' + err);
                    })
            }

            console.log('request_data.event_info.attendees[i].tokens: ' + JSON.stringify(request_data.event_info.attendees[i].tokens, null, 2));

            authorize(credentials, request_data.event_info.attendees[i].tokens, getOwnCal, request_data, all_busy)
            //TODO: implement attendees' refresh_token
                .then(new_all_busy => {
                    all_busy = JSON.parse(JSON.stringify(new_all_busy));
                    next(++i);
                })
                .catch(err => {
                    console.log('Failed during gathering of users\' busy times');
                    reject(err);
                })
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
                    /* No longer using ottoPlan calendar to reduce permissions
                    // Search for existing ottoPlan calendar
                    if (calendars_list[key].summary == 'ottoPlan Meetings') {
                        otto_cal_ID = calendars_list[key].id;
                    }
                    */
                }

                getOwnBusy(auth, own_cal_ids, request_data, all_busy)
                    .then(event_info => {
                        //console.log('\ngetOwnCal event_info: ' + JSON.stringify(event_info, null, 2) + '\n');
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
async function getOwnBusy(auth, own_cal_ids, request_data, all_busy) {
    const calendar = google.calendar({version: 'v3', auth});

    /* No longer creating/using ottoPlan calendar to reduce permissions
    // If no ottoPlan calendar, create one
    if (otto_cal_ID == '') {
        otto_cal_ID = await createCal(auth)
    }
    */

    console.log('Fetching user\'s busy times from Calendar API...\n');
    //console.log('own_cal_ids: ' + JSON.stringify(own_cal_ids, null, 2) + '; typeof: ' + typeof own_cal_ids + '\n');
    //console.log('request_data.start_time' + request_data.start_time, '\n');
    //console.log('request_data.end_time' + request_data.end_time, '\n');
    //console.log('request_data: ' + JSON.stringify(request_data, null, 2), '\n');

    return new Promise( (resolve, reject) => {
        calendar.freebusy.query({
            auth: auth,
            headers: {"content-type": "application/json" },
            resource:{
                items: own_cal_ids,
                //timeMin: request_data.start_date,
                // TODO: fix timeMin call when form is sent correctly from frontEnd
                //timeMin: request_data.scheduling_info.start.dateTime,
                //timeMax: request_data.scheduling_info.end.dateTime,
                //timeMax: request_data.end_date,
                timeMin: request_data.schedule_info.start_date,
                timeMax: request_data.schedule_info.end_date
                
                // Compiling the list of busy times all in UTC to account for possible variety of time zones accross all calendars
                // To request return data in PST instead of UTC:
                // timeZone: "-0800"
            }
        })
            .then(busy_times => {
                console.log('Response from Calendar API: ' + JSON.stringify(busy_times, null, 2) + '\n');
                duration = "01:00";
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
                    //console.log('curr_id: ' + curr_id + '\n');
                    //console.log('busy_times.data: ' + JSON.stringify(busy_times.data, null, 2) + '\n');
                    //console.log('busy_times.data.calendars: ' + JSON.stringify(busy_times.data.calendars, null, 2) + '\n');
                    //console.log('busy_times.data.calendars[curr_id]: ' + JSON.stringify(busy_times.data.calendars[curr_id], null, 2) + '\n');
                    //console.log('busy_times.data.calendars[curr_id].busy: ' + JSON.stringify(busy_times.data.calendars[curr_id].busy, null, 2) + '\n');
                    if (busy_times.data.calendars[curr_id].busy.length > 0) {
                        cal_busy = [];
                        //console.log('pre-processing for ' + curr_id + '\n');
                        cal_busy = merge_busy(cal_busy, busy_times.data.calendars[curr_id].busy, duration);
                        //console.log('cal_busy[' + curr_id + ' = ' + i + ']: ' + JSON.stringify(cal_busy, null, 2) + '\n');
                        user_busy = merge_busy(user_busy, cal_busy, duration);
                    }
                    //console.log('user_busy after[' + curr_id + ' = ' + i + ']: ' + JSON.stringify(user_busy, null, 2) + '\n');
                    /*
                    for (int j = 0; j < busy_times.data.calendars.busy.length; j++) {
                        user_busy.push(
                    var busy_slot = {
                        'start_time': busy_times.data.calendars[i].busy.start, 
                        'end_time': busy_times.data.calendars[i].busy.end
                    }
                    user_busy.push(busy_slot);
                    */
                }
                //console.log('COMPLETE user_busy: ' + JSON.stringify(user_busy, null, 2) + '\n');


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
        // TODO: extract the correct start time for the event
        // add the duration to get the end time
        // TODO: account for time zones

        // Start at beginning of request_data.start_time request.data.work_time
        // Don't look for times outside of working hours (and in the future outside of working days)

        // Hard-coding saturday and sunday as non-working days
        // Hard-coding 9-5 as working hours






        var search_start = parseDate(request_data.schedule_info.start_date);
        //search_start = new Date(search_start.getTime());
        //var test_date = new Date(search_start.getTime());
        //console.log('test_date: ' + test_date + '\tconverted: ' + test_date.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}) + '; typeof: ' + typeof test_date + '\n');

        //console.log('Pre-loop search start: ' + search_start + '; typeof: ' + typeof search_start + '\n');
        // TODO: implement working hours
        //var day_end = 
        var i = 0;
        var time_found = false;
        console.log('in findWindow\n');

        while (i < all_busy.length) {

            console.log('Loop #' + i + ':\n\tsearch_start: ' + search_start + '\n');
            console.log('\tsearch_start.getDay(): ' + search_start.getDay() + '\n');
            console.log('\tsearch_start.getHours(): ' + search_start.getHours() + '\n');



            // Available meeting time found
            if (gapOkay(search_start, parseDate(all_busy[i].start), duration)) {
                
                var end_date = new Date();
                //console.log('typeof: ' + typeof end_time);
                end_date.setTime(search_start.getTime() + toMSec(duration));

                console.log('end_date.getHours(): ' + end_date.getHours() + '\n');
                
                // Check if end_date is outside of working hours
                if (end_date.getHours() >= 17) {
                    console.log('Ends outside of working hours: ' + end_date.getHours() + '\n');
                    search_start = parseDate(all_busy[i++].end);
                    continue;
                }


                // CALL CREATE_EVENT
                request_data.event_start = ISODateString(search_start);
                console.log('request_data.event_start: ' + request_data.event_start);


                //console.log('end_time + ms = ' + end_time + '; typeof: ' + typeof end_time);

                request_data.event_end = ISODateString(end_date);
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
                    reject(err);
                })
        }
        else {
            reject('No available time found');
        }
    });
    console.log('Ending findWindow...\n');
}

/* https://stackoverflow.com/a/7244288
 * use a function for the exact format desired... */
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
    for (i = 0; i < request_data.event_info.attendees.length; i++) {
        attendee_emails.push(request_data.event_info.attendees.email);
    }
    console.log('attendee_emails: ' + JSON.stringify(attendee_emails, null, 2) + '\n');

    //console.log(own_events);
    const calendar = google.calendar({version: 'v3', auth});
    var new_event = {
        // TODO: Update the rhs of these when form sends correct JSON
        //summary: request_data.event_info.summary,
        summary: request_data.event_info.summary,
        //location: request_data.event_info.location,
        location: request_data.event_info.location,
        //description: request_data.event_info.description,
        description: request_data.event_info.description,
        start: {
            //dateTime: request_data.scheduling_info.start.dateTime,
            //dateTime: request_data.start_time,
            dateTime: request_data.event_start,
            //timeZone: 'America/Los_Angeles'
            //timeZone: request_data.scheduling_info.timezone
        },
        end: {
            //dateTime: request_data.end_time,
            dateTime: request_data.event_end,
            //timeZone: 'America/Los_Angeles'
            // timeZone: request_data.scheduling_info.timezone
        },
        // TODO: Importing emails from request_data isn't working right now because it's coming in as a list of email addresses, but we need it as an object in the format below
        //attendees: request_data.email,
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
                //calendarId: otto_cal_ID,
                // TODO: remove this and change back to primary when done with testing
                //calendarId: 'aa2ab10qanobloa2g9eqh7i50o@group.calendar.google.com',
                calendarId: 'primary',
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
                //console.log('createEvent event: ' + JSON.stringify(created_event, null, 2), '\n');

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
    end_date.setMilliseconds(0);

    //var i = 0;
    while (new Date(search_start).getTime() < new Date(end_date).getTime()) {
        /*console.log('-------------------\nwhile loop #' + i + '\n');
        console.log('search_start: ' + search_start + '\n');
        console.log('parseDate(request_data.end_time): ' + parseDate(request_data.end_time) + '\n');
        i++;
        */

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

        if (search_start.getDay() == 0 || search_start.getDay() == 6 || (search_start.getDay() == 5 && search_start.getHours() >= 9)) {
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
                nonwork_end.setHours(9);
                nonwork_end.setMinutes(0);
                nonwork_end.setSeconds(0);
                nonwork_end.setMilliseconds(0);
            }
            else {
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

        }

        //console.log('Checking if next working day is before end of search window\n');

        // If the next working day is after the end of the search window, just set it to the end of the search window
        if (nonwork_end > parseDate(request_data.schedule_info.end_date)) {
            nonwork_end.setTime(end_date.getTime());
            nonwork_end.setMilliseconds(0);
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

    console.log('working_hours: ' + JSON.stringify(working_hours, null, 2) + '\n');
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

    /*
            if (search_start.getDay() == 6 || search_start.getDay() == 0) {
                console.log('Saturday or Sunday: ' + search_start.getDay() + '\n');
                search_start = parseDate(all_busy[i++].end);
                continue;
            }
            if (search_start.getHours() < 9 || search_start.getHours() >= 17) {
                console.log('Starts outside of working hours: ' + search_start.getHours() + '\n');
                search_start = parseDate(all_busy[i++].end);
                continue;
            }
            */

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
                //if (startsEarlier(all_busy[i].end, user_busy[j].end)) {
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
                //if (gapOkay(user_busy[j].start, all_busy[i].end, duration)) {
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
            //if (gapOkay(user_busy[j].end, user_busy[j + 1].start, duration)) {
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
         *   don't need to perform these checks; just concatenate remaining contents 
        if (gapOkay(all_busy[i].end_time, all_busy[i + 1].start_time, duration)) {
            new_busy.push(all_busy[i++]);
        }
        else {
            // consolidate the events and discard the first
            // Don't push second yet; must check for sufficient gap length
            all_busy[i + 1].start_time = all_busy[i].start_time;
            j++;
        }
        */
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
