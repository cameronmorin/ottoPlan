import React from 'react';
import logo from './logo.svg';
import './style/App.css';

import firebase from 'firebase';
import firebaseConfig from './service/fconfig';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';

import Sidebar from './Sidebar';
import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import FriendIcon from '@material-ui/icons/People';
import AccountIcon from '@material-ui/icons/AccountBox';
import SignoutIcon from '@material-ui/icons/ExitToApp';

const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
  ],
  callbacks: {
    signInSuccess: () => false
  }
};

const items = [
  { name: 'home', label: 'Home', Icon: HomeIcon},
  { name: 'friends', label: 'Friends', Icon: FriendIcon},
  { 
    name: 'settings', 
    label: 'Settings',
    Icon: SettingsIcon,
    items: [
             {name: 'account', label: 'Account', Icon: AccountIcon},
             {name: 'signout', label: 'Sign Out', Icon: SignoutIcon},
           ],
  },
]


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
  }

  componentDidUpdate = () => {
    if (!this.state.isAuthenticated) {
      console.log('Redirecting to sign in...');
    }
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
          <StyledFirebaseAuth
            uiConfig={uiConfig}
            firebaseAuth={firebase.auth()}
          />
        }
      </div>
      </>
    );
  }
}
