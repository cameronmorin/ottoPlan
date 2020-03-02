import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './style/App.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'

import firebase from 'firebase';
import firebaseConfig from './service/fconfig';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';

import Sidebar from './Sidebar';
import Grid from '@material-ui/core/Grid'
import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import FriendIcon from '@material-ui/icons/People';
import AccountIcon from '@material-ui/icons/AccountBox';
import SignoutIcon from '@material-ui/icons/ExitToApp';
import NotifIcon from '@material-ui/icons/Notifications';
import UnreadIcon from '@material-ui/icons/NotificationImportant';

import EventForm from './EventForm'

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

function LaunchForm() {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <ButtonToolbar>
      <Button onClick={handleShow}>
        Create an Event
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create an Event</Modal.Title>
        </Modal.Header>
        <Modal.Body> <EventForm /> </Modal.Body>
      </Modal>
    </ButtonToolbar>
  );
}

var unread = false;

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      currentUser: null,
      show: false,
      setShow: false
    };
  }

  componentDidMount = () => {
    firebase.auth().onAuthStateChanged(user => {
      this.setState({
        isAuthenticated: !!user
      });

      // Update state user object
      if (!!user) {
        this.setState({currentUser: user.providerData[0], isAuthenticated: !!user});
        // Check if user is in DB
      }
      else {
        this.setState({currentUser: null, isAuthenticated: !!user});
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
      <div>
        {this.state.isAuthenticated ?
          <Grid container maxWidth="xl" justify="flex-start" alignItems="flex-start" spacing={3} className="Menu">
            <Grid item xs={12}>
              <img alt="profile picture" src={firebase.auth().currentUser.photoURL} style={{ height: "50px", width: "50px", borderRadius: "50%"}}/>
            </Grid>
            <Grid item xs={12}>
              <Sidebar items={items}/>
            </Grid>
            <Grid item className="App-header" xs={12}>
              {this.state.isAuthenticated ? 
                <>
                    <LaunchForm />
                </>
                : 
                <StyledFirebaseAuth
                  uiConfig={uiConfig}
                  firebaseAuth={firebase.auth()}
                />
              }
            </Grid>
          </Grid>
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
