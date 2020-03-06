import * as firebase from 'firebase/app';
// import 'firebase/auth';
// import 'firebase/firestore';
// import firebaseConfig from './fconfig';

const saveUser = (uid) => {
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
    refreshToken: user.refreshToken
  }, {merge: true}).then(() => {console.log('User Information Updated.');});
}

const searchUserByEmail = async searchEmail => {
  var db = firebase.firestore();
  return db.collection('users').where('email', '==', searchEmail).get();
}


export default { saveUser, searchUserByEmail };