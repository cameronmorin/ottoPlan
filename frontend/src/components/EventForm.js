import React from 'react'
import '../style/App.css';

import TextInput from './TextInput';
import validate from './validation';
import SelectOption from './SelectOption';
import Attendees from './Attendees';
import backend from '../service/firebase';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { Modal, Button } from 'react-bootstrap'

//TODO: find better way to init min/max
const min = new Date();
min.setHours(9);
min.setMinutes(0);
const max = new Date();
max.setHours(17);
max.setMinutes(0);

export default class EventForm extends React.Component {
    constructor(props) {
      super(props);
      this.state={
        formValid: true,
        showError: false,
        checkList: [],
        attendees: [],
        
        formControls: {
          summary: {
            value: '',
            valid: false,
            touched: false,
            validationRules: {isRequired: true},
            from: 'event'
          },
          location: {
            value: '',
            valid: true,
            touched: false,
            validationRules: {isRequired: false},
            from: 'event'
          },
          description: {
            value: '',
            valid: true,
            touched: false,
            validationRules: {isRequired: false},
            from: 'event'
          },
          event_duration: {
            value: '',
            valid: false,
            touched: false,
            validationRules: {isRequired: true},
            options: [
              {value: '15', label: '15 minutes'},
              {value: '30', label: '30 minutes'},
              {value: '45', label: '45 minutes'},
              {value: '60', label: '1 hour'},
              {value: '75', label: '1 hour 15 minutes '},
              {value: '90', label: '1 hour 30 minutes'},
              {value: '105', label: '1 hour 45 minutes'},
              {value: '120', label: '2 hours'},
            ],
            from: 'schedule',
            duration: { hr: '', min: ''},
          },
          timezone: {
            value: '',
            valid: true,
            touched: false,
            validationRules: {isRequired: false},
            options: [
              {value: "America/Chicago", label: 'America/Chicago'},
              {value: "America/Denver", label: 'America/Denver'},
              {value: "America/Detroit", label: 'America/Detroit'},
              {value: "America/Indiana", label: 'America/Indiana'},
              {value: "America/Kentucky", label: 'America/Kentucky'},
              {value: "America/Los_Angeles", label: 'America/Los_Angeles'},
              {value: "America/New_York", label: 'America/New_York'},
              {value: "America/Phoenix", label: 'America/Phoenix'},
            ],
            from: 'schedule',
          },
        },
        
        startDate: new Date(),
        endDate: new Date()
      }
    }

    //handler for input boxes
    changeHandler = event => {
      const name = event.target.name;
      const value = event.target.value;
      const updatedControls = {
        ...this.state.formControls
      };
      const updatedFormElement = {
        ...updatedControls[name]
      };
      updatedFormElement.value = value;
      updatedFormElement.valid = validate(this.state.formControls.value, this.state.formControls.validationRules)
      
      updatedControls[name] = updatedFormElement;
      
      this.setState({ formControls: updatedControls });
    }

    //handler for calendar selection
    changeStartHandler = date => {

      this.setState({
        startDate: date
      });
    };

    changeEndHandler = date => {
      this.setState({
        endDate: date
      });
    };

    //handle closing of modal
    handleModalClose = () => {
      this.setState({
        showError: false
      });
    };

    checkAttendee = async event => {
      var newList = this.state.checkList;
      // const uid = event.target.id;
      const idPos = newList.findIndex(id => id === event.target.id);
      if (idPos === -1) {
        // UID is not in array
        newList.push(event.target.id);
      }
      else {
        // Remove attendee from list
        newList.splice(idPos, 1);
      }
      this.setState({checkList: newList});
      console.log('Attendee Update: ', this.state.checkList);
    }

    setAttendees = async () => {
      var attendeeList = [];
      for (let i = 0; i < this.state.checkList.length; ++i) {
        const data = await backend.getAttendeeInfo(this.state.checkList[i]);
        attendeeList.push(data);
      }
      return attendeeList;
    }

    //handler for submit/making json
    formSubmitHandler = async () => {
      const event_info = {};
      const schedule_info = {};
      const data = {event_info, schedule_info};
      
      //check for unfilled required questions
      let formValid = true;
      for (let x in this.state.formControls) {
        this.setState({valid: validate(this.state.formControls.value, this.state.formControls.validationRules)});
        if(this.state.formControls[x].valid === false) {
          formValid=false;
          break;
        }
      }
      //set form's validity for error layout of inputs
      
      if(formValid === false) {
      this.setState({formValid: formValid});
        this.setState({ showError: true });
      }
      else {  //populate JSON for backend
        // Get email/refresh tokens for all attendees and put into list
        const organizerData = await backend.getAttendeeInfo(this.props.currentUser.uid)
        const attendeeList = await this.setAttendees();

        for(let y in this.state.formControls) {
          if(this.state.formControls[y].from === 'event') {
            data.event_info[y] = this.state.formControls[y].value;
          }
        }
        data.schedule_info["duration"] = {hr: '', min: ''};
        let hour = -1;
        let val = this.state.formControls["event_duration"].value
        while (val > 0) {
          val -= 59   ;
          hour += 1;
        }
        data.schedule_info["duration"].hr = hour.toString();
        data.schedule_info["duration"].min = (this.state.formControls["event_duration"].value % 60).toString();
        data.schedule_info["start_date"] = this.state.startDate;
        data.schedule_info["end_date"] = this.state.endDate;
        data.schedule_info["timezone"] = this.state.formControls["timezone"].value;
        
        // Set organizer and attendee info in the JSON file
        data.schedule_info["organizer"] = organizerData;
        data.event_info["attendees"] = attendeeList;
        
        //event info to send to backend
          //alert(JSON.stringify(data, null, 2));
          fetch('/schedule_event', {
              method: 'POST', 
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
          })
          .then(response => response.json())
          .then(result => {
              console.log('Success json: ', JSON.stringify(result));
              alert('Link: (THIS STILL DOESN\'T WORK)', JSON.stringify(result.data.htmLink, null, 2));
          })
          .catch((err) => {
              console.log('Error: ', err);
              alert('Error: ', err);
          });
      }
    }

    render () {
        return (
          <>
            <div className="event-form">
              {/*event_info*/}
              <label className="form-title">Create an Event</label>
              <TextInput name="summary" initVal = {this.state.formControls.summary.initVal} value={this.state.formControls.summary.value} onChange={this.changeHandler} valid={this.state.formControls.summary.valid} formValid={this.state.formValid}/>
              <TextInput name="location" initVal = {this.state.formControls.location.initVal} value={this.state.formControls.location.value} onChange={this.changeHandler} valid={this.state.formControls.location.valid} formValid={this.state.formValid}/>
              <TextInput name="description" initVal = {this.state.formControls.description.initVal} value={this.state.formControls.description.value} onChange={this.changeHandler} valid={this.state.formControls.description.valid} formValid={this.state.formValid}/>
              {/* <TextInput name="attendees" initVal = {this.state.formControls.attendees.initVal} value={this.state.formControls.attendees.value} onChange={this.changeHandler} valid={this.state.formControls.attendees.valid} formValid={this.state.formValid}/> */}
              <h4>Attendees</h4>
              <Attendees contacts={this.props.contacts} checkBox={this.checkAttendee}/>
              {/*schedule_info
                 TODO: fix format (grid?), add validation for dates*/}
              <SelectOption name="timezone" onChange={this.changeHandler} valid={this.state.formControls.timezone.valid} formValid={this.state.formValid} options={this.state.formControls.timezone.options} default={this.state.formControls.timezone.default}/>
              <label>Start Date</label>
              <DatePicker 
                selected={this.state.startDate} 
                onChange={this.changeStartHandler}
                inline
                showMonthDropdown
                showYearDropdown
                showTimeSelect
                minTime={min}
                maxTime={max}
                timeFormat="hh:mm aa"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy h:mm aa"    
                placeholderText="Select a starting date/time"
              />
              <label>End Date</label>
              <DatePicker 
                selected={this.state.endDate} 
                onChange={this.changeEndHandler}
                inline
                showMonthDropdown
                showYearDropdown
                showTimeSelect
                minTime={min}
                maxTime={max}
                timeIntervals={15}
                timeCaption="Time"
                timeFormat="hh:mm aa"
                dateFormat="MMMM d, yyyy h:mm aa"    
                placeholderText="Select an ending date/time"
              />
              <SelectOption name="event_duration" hr={this.state.formControls.event_duration.duration.hr} min={this.state.formControls.event_duration.duration.min} onChange={this.changeHandler} label={this.state.formControls.event_duration.label} valid={this.state.formControls.event_duration.valid} formValid={this.state.formValid} options={this.state.formControls.event_duration.options} default={this.state.formControls.event_duration.default}/>
              
              <button onClick={this.formSubmitHandler} > Submit </button>
            </div>
            <Modal show={this.state.showError} onHide={this.handleModalClose}>
              <Modal.Header closeButton>
                <Modal.Title>Error</Modal.Title>
              </Modal.Header>
              <Modal.Body>Please fill out all required fields</Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={this.handleModalClose}>Close</Button>
              </Modal.Footer>
            </Modal>
          </>
        );
    }
}
