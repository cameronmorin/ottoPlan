import React from 'react';
import firebase from 'firebase';
import './style/App.css';
import backend from './service/firebase';

import Sidebar from './components/Sidebar';
import { Button } from 'react-bootstrap';
import EventForm from './components/EventForm';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.db = firebase.firestore();

    this.state = {
      isAuthenticated: false,
      isLoading: false,
      currentUser: null,
      contacts: null,
      searchBox: null,
      searchResults: null,
      show: false,
      setShow: false
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
        // Get user contacts on sign in FIXME later
        this.getContacts();
      }
      else {
        this.setState({
          isAuthenticated: false,
          currentUser: null
        });
      }
    });
  }

  getContacts = async () => {
    this.setState({isLoading: true});
    const results = await backend.returnContacts(this.state.currentUser.uid);
    this.setState({isLoading: false, contacts: results});
  }

  popupSignIn = () => {
    var GoogleProvider = new firebase.auth.GoogleAuthProvider();
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    GoogleProvider.setCustomParameters({'access_type': 'offline'});
    firebase.auth().signInWithPopup(GoogleProvider).then(result => {
      console.log('Succes!\n', result);
      backend.saveUser(result.additionalUserInfo.profile.id, result.credential.accessToken);
    }).catch(error => {
      console.log('Error signing in.');
      console.log(error);
    });
  }

  signOut = () => {
    firebase.auth().signOut().then(() => {
      console.log('Sign out successful.');
      window.location.reload();
    }).catch(error => {
      console.log('Error signing out: ', error);
    });
  }

  render() {
    return (
      <div className='App'>
        {this.state.isAuthenticated ?
          <div className='home-grid'>
            <div className='hg-left'>
              <Sidebar photo={this.state.currentUser.photoURL} signOut={this.signOut}/>
            </div>
            <div className='hg-right'>
              <EventForm currentUser={this.state.currentUser} contacts={this.state.contacts}/>
            </div>
          </div>
          :
          <div className='home-login'>
            <h1 className='home-title font-effect-3d-float'>ottoPlan</h1>
            <p className='home-quip'>Reducing decision fatigue!</p>
            <Button onClick={this.popupSignIn} variant='outline-light' className='home-btn'>Login with Google</Button>
          </div>
        }
      </div>
    );
  }
}
