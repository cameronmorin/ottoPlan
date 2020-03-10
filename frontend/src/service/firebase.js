import * as firebase from 'firebase/app';
// import 'firebase/auth';
// import 'firebase/firestore';
// import firebaseConfig from './fconfig';

const saveUser = (uid, token) => {
  const user = firebase.auth().currentUser;
  const pData = user.providerData[0];
  console.log(pData);

  var db = firebase.firestore();
  const userDoc = db.collection('users').doc(uid);

  userDoc.set({
    uid: pData.uid,
    displayName: pData.displayName,
    email: pData.email,
    photoURL: pData.photoURL,
    refreshToken: user.refreshToken,
    accessToken: token
  }, {merge: true}).then(() => {console.log('User Information Updated.');});
}

const searchUserByEmail = async searchEmail => {
  var db = firebase.firestore();
  return db.collection('users').where('email', '==', searchEmail).get();
}

const searchUserByName = async searchName => {
  var db = firebase.firestore();
  return db.collection('users').where('displayName', '==', searchName).get();
}

const getAttendeeInfo = async searchId => {
  var db = firebase.firestore();
  const user = (await db.collection('users').doc(searchId).get()).data();
  const toReturn = {
    email: user.uid,
    refresh_token: user.refreshToken,
    access_token: user.accessToken
  };
  return toReturn;
}

const addContact = async (currentID, newID) => {
  var db = firebase.firestore();
  const userDoc = db.collection('users').doc(currentID);
  
  var updatedContacts = [];
  const data = (await userDoc.get()).data();

  if (data.contacts) {
    for (let i = 0; i < data.contacts.length; ++i) {
      if (data.contacts[i] !== newID) {
        updatedContacts.push(data.contacts[i]);
      }
    }
  }
  updatedContacts.push(newID);

  await userDoc.set({
    contacts: updatedContacts
  }, {merge: true}).then(async () => {
    return (await returnContacts(currentID));
  });
}

const removeContact = async (currentID, removeID) => {
  var db = firebase.firestore();
  const userDoc = db.collection('users').doc(currentID);

  var updatedContacts = [];
  const data = (await userDoc.get()).data();

  if (data.contacts) {
    for (let i = 0; i < data.contacts.length; ++i) {
      if (data.contacts[i] !== removeID) {
        updatedContacts.push(data.contacts[i]);
      }
    }
  }

  await userDoc.set({
    contacts: updatedContacts
  }, {merge: true}).then(async () => {
    return (await returnContacts(currentID));
  });
  
}

const returnContacts = async userId => {
  var db = firebase.firestore();
  const userDoc = db.collection('users').doc(userId);
  const userData = (await userDoc.get()).data();

  var contactObjects = [];
  if (userData.contacts) {
    for (let i = 0; i < userData.contacts.length; ++i) {
      const currContact = (await db.collection('users').doc(userData.contacts[i]).get()).data();
      contactObjects.push(currContact);
    }
  }
  return contactObjects;
}

export default { saveUser, searchUserByEmail, searchUserByName, getAttendeeInfo, addContact, removeContact, returnContacts };