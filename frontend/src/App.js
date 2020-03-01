import React from 'react';
import logo from './logo.svg';
import './style/App.css';

import firebase from 'firebase';
import firebaseConfig from './service/fconfig';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import { GoogleLogin } from 'react-google-login';
import backend from './service/firebase';

import Sidebar from './Sidebar';
import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import FriendIcon from '@material-ui/icons/People';
import AccountIcon from '@material-ui/icons/AccountBox';
import SignoutIcon from '@material-ui/icons/ExitToApp';
import EventIcon from '@material-ui/icons/Event';
import NotifIcon from '@material-ui/icons/Notifications';
import UnreadIcon from '@material-ui/icons/NotificationImportant';

const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    }
  ],
  callbacks: {
    signInSuccess: () => false
  }
};

const items = [
  { name: 'home', label: 'Home', Icon: HomeIcon},
  { name: 'friends', label: 'Friends', Icon: FriendIcon},
  { name: 'create event', label: 'Create Event', Icon: EventIcon},
  { name: 'notifications', label: 'Notifications', Icon: unread ? UnreadIcon : NotifIcon},
  { 
    name: 'settings', 
    label: 'Settings',
    Icon: SettingsIcon,
    items: [
             {name: 'account', label: 'Account', Icon: AccountIcon},
             {name: 'sign out', label: 'Sign Out', Icon: SignoutIcon},
           ],
  },
]

var unread = false;


export default class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.db = firebase.firestore();

    this.state = {
      isAuthenticated: false,
      currentUser: null
    };
  }

  componentDidMount = () => {
    firebase.auth().onAuthStateChanged(user => {
      // Update state user object
      if (user) {
        this.setState({
          isAuthenticated: true,
          currentUser: user.providerData[0]
        });
      }
      else {
        this.setState({
          isAuthenticated: false,
          currentUser: null
        });
      }
    });
  }

  popupSignIn = () => {
    var GoogleProvider = new firebase.auth.GoogleAuthProvider;
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    firebase.auth().signInWithPopup(GoogleProvider).then(result => {
      console.log('Succes!\n', result);
      backend.saveUser(result.additionalUserInfo.profile.id);
    }).catch(error => {
      console.log('Error signing in.');
      console.log(error);
    });
  }

  render() {
    return (
      <>
      <div className="Menu">
        {this.state.isAuthenticated ? <Sidebar items={items}/> : null}
      </div>
      <div className="App-header">
        {this.state.isAuthenticated ? 
          <>
            <img alt="profile picture" src={firebase.auth().currentUser.photoURL} style={{ height: "50px", width: "50px", borderRadius: "50%", position: "absolute", left: "10px", top: "15px"}}/>
            <p>Hello, {firebase.auth().currentUser.displayName}!</p>
            {/* <button onClick={() => firebase.auth().signOut()}>Sign Out!</button>  */}
          </>
          :
          <button onClick={this.popupSignIn}>Login Test</button>
        }
      </div>
      </>
    );
  }
}
