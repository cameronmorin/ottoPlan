import React from 'react';
import firebase from 'firebase';
import './style/App.css';
import backend from './service/firebase';

import Sidebar from './components/Sidebar';
import { Button } from 'react-bootstrap';

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
    var GoogleProvider = new firebase.auth.GoogleAuthProvider();
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
      <div className='App'>
        {this.state.isAuthenticated ?
          <div className='home-grid'>
            <div className='hg-left'>
              <Sidebar photo={this.state.currentUser.photoURL}/>
            </div>
            <div className='hg-right'>
              <p className='home-quip'>dashboard</p>
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
