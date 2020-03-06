import React from 'react';
import firebase from 'firebase';
import './style/App.css';
import backend from './service/firebase';
import {Button} from 'react-bootstrap';

import Sidebar from './components/Sidebar';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.db = firebase.firestore();

    this.state = {
      isAuthenticated: false,
      currentUser: null,
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
      }
      else {
        this.setState({
          isAuthenticated: false,
          currentUser: null
        });
      }
    });
  }

  updateEmail = event => {
    // console.log(event.target.value);
    this.setState({searchEmail: event.target.value});
  }

  onSubmit = async event => {
    console.log('Calling backend');
    await backend.searchUserByEmail(this.state.searchEmail).then(result => {
      console.log('Result: ', result);
      console.log('size: ', result.length);
      result.forEach(doc => {
        console.log(doc.id, '=> ', doc.data());
      });
      // if (result.length == 0) {
      //   console.log('No results.');
      // }
      // else {
      //   result.forEach(doc => {
      //     console.log(doc.id, '=> ', doc.data());
      //   });
      // }
    }).catch(error => {
      console.log('Error getting documents: ', error);
    });
    console.log('finished');
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
              {/* <form onSubmit={this.onSubmit}>
                <label>Email: */}
                  <input type='text' name='name'onChange={this.updateEmail}/>
                  <button onClick={this.onSubmit}>Click Me</button>
                {/* </label>
              </form> */}
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
