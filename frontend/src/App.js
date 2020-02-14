import React from 'react';
import logo from './logo.svg';
import './style/App.css';

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
      </div>
    );
  }
}
