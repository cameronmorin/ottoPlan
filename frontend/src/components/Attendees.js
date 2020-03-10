import React from 'react';
import { Spinner } from 'react-bootstrap';
import '../style/Attendees.css';

export default class Attendees extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      contacts: null
    }
  }

  componentDidMount() {
    this.setState({contacts: this.props.contacts});
  }

  render() {
    return (
      <>
        <p>Contacts</p>
        {this.props.contacts === null ?
          <Spinner animation="border" role="status">
            <span className="sr-only">Loading Contacts...</span>
          </Spinner>
          :
          this.props.contacts.map((data, key) => (
            <div className='attendee' key={key}>
              <img className='attendee-img' src={data.photoURL} alt='profile' />
              <div className='attendee-info'>
                <p className='attendee-name'>{data.displayName}</p>
                <p className='attendee-email'>{data.email}</p>
              </div>
              <div className='attendee-check'>
                <input type='checkbox' onClick={this.props.checkBox} id={data.uid}/>
              </div>
            </div>
          ))
        }
      </>
    );
  }
}