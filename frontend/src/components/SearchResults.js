import React from 'react';
import backend from '../service/firebase';
import '../style/SearchResults.css';

import { Button, Spinner } from 'react-bootstrap';

export default class SearchResults extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      query: null,
      contacts: null
    };
  }

  componentDidMount = async => {
    this.returnContacts(this.props.currentUser.uid);
  }

  updateQuery = event => {
    this.setState({query: event.target.value});
  }

  executeSearch = async event => {
    console.log('Calling backend');
    await backend.searchUserByName(this.state.query).then(result => {
      if (result.docs.length > 0) {
        var docs = [];
        result.forEach(doc => {
          if (doc.data().uid !== this.props.currentUser.uid) {
            docs.push(doc.data());
          }
        });
        this.setState({contacts: docs});
      }
    }).catch(error => {
      console.log('Error getting documents: ', error);
    });
    console.log('finished');
  }

  addContact = async event => {
    this.setState({isLoading: true});
    const users = await backend.addContact(this.props.currentUser.uid, event.target.id);
    this.setState({isLoading: false, contacts: users});
  }

  removeContact = async event => {
    this.setState({isLoading: true});
    const users = await backend.removeContact(this.props.currentUser.uid, event.target.id);
    this.setState({isLoading: false, contacts: users});
  }

  returnContacts = async event => {
    this.setState({isLoading: true});
    const users = await backend.returnContacts(this.props.currentUser.uid);
    console.log(users);
    this.setState({isLoading: false, contacts: users});
  }

  checkBox = async event => {
    console.log(event.target.id);
  }

  render() {
    return(
      <>
        {this.state.isLoading ?
          <Spinner animation="border" role="status">
            <span className="sr-only">Loading...</span>
          </Spinner>
          :
          <>
            {/* <input type='text' name='name' onChange={this.updateQuery}/>
            <button onClick={this.executeSearch}>Click Me</button> */}
            {(this.state.contacts && this.state.contacts.length > 0) ? 
              this.state.contacts.map((data, key) => (
                <div className='result-grid' key={key}>
                  <img className='result-image' src={data.photoURL} alt='img' />
                  <div className='result-info'>
                    <p className='result-info-name'>{data.displayName}</p>
                    <p className='result-info-email'>{data.email}</p>
                  </div>
                  <div className='result-button'>
                    {this.props.button}
                    <Button variant='danger' onClick={this.removeContact} id={data.uid}>Remove</Button>
                  </div>
                </div>
              ))
              :
              <p>No data to display</p>
            }
          </>
        }
      </>
    );
  }
}