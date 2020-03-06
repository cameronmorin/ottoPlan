import React from 'react';
import logo from './logo.svg';
import './style/App.css';
import Event from "./Event";

import firebase from 'firebase';
import firebaseConfig from './service/fconfig';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';

const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
  ],
  callbacks: {
    signInSuccess: () => false
  }
};


export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      currentUser: null
    };
  }

  componentDidMount = () => {
    firebase.auth().onAuthStateChanged(user => {
      this.setState({
        isAuthenticated: !!user
      });
      
      // Update state user object
      if (user) {
        this.setState({currentUser: user.providerData[0]});
        // Check if user is in DB
      }
      else {
        this.setState({currentUser: null});
      }
    });

        var data_out = {
            "event_info": {
                "summary": "Test Event from JSON",
                "location": "ur mom",
                "description": "Sending JSON from frontend to backend",
                "attendees": [
                    { "email": "ewong012@ucr.edu"},
                    { "email": "padawongplays@gmail.edu"}
                ]
            },
            "scheduling_info": {
              "start": {
                  "dateTime": "2020-02-16T20:00:00-05:00",
                  "timeZone": "America/Los_Angeles"
              },
              "end": {
                  "dateTime": "2020-02-22T20:00:00-09:00",
                  "timeZone": "America/Los_Angeles"
              },
                "event_duration": "",
                "time_zone": "",
                "start_date": "",
                "end_date": "",
                "start_time": "",
                "end_time": ""
            }
          }
      /*
        this.state = { data_out }

        fetch('/schedule_event', {
            method: 'POST',
            body: JSON.stringify(this.state),
            headers: {"Content-Type": "application/json"}
        })
          .then(function(response){
              return response.json()
          }).then(function(body){
              console.log('POST request response: ' + body);
          });

      
    // TODO: Move this to the correct place to receive backend response to event schedule request
    this.state = { schedule_event: {} }
    fetch('/schedule_event')
      .then(res => res.json())
      .then(schedule_event => this.setState({schedule_event}, () => console.log('Schedule event response JSON received: ', schedule_event)));
    */
  }
  
  componentDidUpdate = () => {
    if (!this.state.isAuthenticated) {
      console.log('Redirecting to sign in...');
    }
  }

  render() {
    return (
      <div className="App-header">
        {this.state.isAuthenticated ? 
          <>
            <img alt="profile picture" src={firebase.auth().currentUser.photoURL} style={{height: "75px", width: "75px", borderRadius: "50%"}}/>
            <p>Hello, {firebase.auth().currentUser.displayName}!</p>
            <button onClick={() => firebase.auth().signOut()}>Sign Out!</button> 
          </>
          : 
          <StyledFirebaseAuth
            uiConfig={uiConfig}
            firebaseAuth={firebase.auth()}
          />
        }
        <form id="Scheduling Info" method="POST" action="/schedule_event">
          <label htmlFor="summary">Event title:</label>
          <input text="text" name="summary" value='Test Event'/>
          <label htmlFor="description">Event description:</label>
          <input text="text" name="description" value='This is a test event made within a form on the test site'/><br/><br/>
          <label htmlFor="attendees">Attendee Info:</label>
          <input text="text" name="email" value='ewong012@ucr.edu'/>
          <input text="text" name="email" value=''/><br/><br/>
          {/* TODO: change start_time and end_time to just dates and accomodate in ./backend/index.js accordingly */}
          <label htmlFor="start_time">Start of Time Window</label>
          <input text="text" name="start_time" value="2020-02-16T20:00:00-05:00"/>
          <label htmlFor="end_time">End of Time Window</label>
          <input text="text" name="end_time" value="2020-02-22T20:00:00-09:00"/><br/><br/>
          <label htmlFor="work_start">Start of Working Hours</label>
          <input text="text" name="work_start" value="09:00"/>
          <label htmlFor="work_end">End of Working Hours</label>
          <input text="text" name="work_end" value="17:00"/><br/><br/>
          {/* TODO: add non-working days (weekends) */}
          <label htmlFor="duration">Meeting Duration</label>
          <input text="text" name="duration" value="01:00"/><br/><br/>
          <label htmlFor="time_zone">Time Zone</label>
          <input text="text" name="time_zone" value="PST"/><br/><br/>
          <input type="submit" value="submit" />
        </form>
        <Event />
      </div>
    );
  }
}
