import React from 'react';
import logo from './logo.svg';
import './style/App.css';

import firebase from 'firebase';
import firebaseConfig from './service/fconfig';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import { GoogleLogin } from 'react-google-login';

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

const responseGoogle = (response) => {
  console.log(response);
}


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
        // firebase.auth().currentUser.getIdToken(true).then(idToken => {console.log(idToken)});
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

  popupSignIn = () => {
    var GoogleProvider = new firebase.auth.GoogleAuthProvider;
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar');
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
    GoogleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    firebase.auth().signInWithPopup(GoogleProvider).then(result => {
      console.log('Succes!');
      console.log(result.credential.accessToken);
    }).catch(error => {
      console.log('Error signing in.');
      console.log(error);
    });
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
          // <StyledFirebaseAuth
          //   uiConfig={uiConfig}
          //   firebaseAuth={firebase.auth()}
          // />

          <button onClick={this.popupSignIn}>Login Test</button>

          // <GoogleLogin
          //   clientId="647293554034-efae43k2ivikha1p20rbljeterl7mf7v.apps.googleusercontent.com"
          //   buttonText="Login"
          //   onSuccess={responseGoogle}
          //   onFailure={responseGoogle}
          //   cookiePolicy={'single_host_origin'}
          // />
        }
      </div>
    );
  }
}
