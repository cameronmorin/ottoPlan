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

export default class EventForm extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            formValid: true,
            showError: false,
            showTimeError: false,
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
                    validationRules: {
                        validTime: true,
                    },
                    from: 'schedule',
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
                    from: 'schedule'
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
        updatedFormElement.valid = validate(updatedFormElement.value, updatedFormElement.validationRules);

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

        //check validity of form inputs
        for (let x in this.state.formControls) {
            formValid = formValid && this.state.formControls[x].valid;

            if(this.state.formControls[x].valid === false) {
                formValid=false;

                //sets feedback modal's message based off of which feed is invalid
                if (this.state.formControls[x].validationRules.validTime) this.setState({ showTimeError: true});
                else this.setState({ showTimeError: false});
                break;
            }
        }
        //set form's validity for error layout of inputs


        //check validity of event duration
        //TODO: add more error message for invalid event duration

        let selectedStartTime = this.state.startDate.getHours() * 60 + this.state.startDate.getMinutes();
        let selectedEndTime = this.state.endDate.getHours() * 60 + this.state.endDate.getMinutes();
        let temp = this.state.formControls.event_duration.value;
        let inputTime = parseInt(temp.substring(0,1)) * 60 + parseInt(temp.substring(3,4));

        if (inputTime  > (selectedEndTime - selectedStartTime) && this.state.endDate < this.state.startDate) {
            formValid = false;
        }


        if(formValid === false) {
            this.setState({formValid: formValid, showError: true});
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
            
            data.schedule_info["duration"] = this.state.formControls["event_duration"].value.toString();
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
                    console.log('Response JSON: ', JSON.stringify(result));
                    // I can't figure out how to print the json stuff to the alert window
                    if (result.status === 200) {
                        alert('Event created');
                    }
                    else {
                        alert('Event not created - ' + result.statusText);
                    }
                    //alert('Link: (THIS STILL DOESN\'T WORK)', JSON.stringify(result.data.htmLink, null, 2));
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
            <label>Start date</label>
            <DatePicker 
            className="calendar"
            selected={this.state.startDate} 
            onChange={this.changeStartHandler}
            inline
            showMonthDropdown
            showYearDropdown
            showTimeInput
            timeCaption="Time:" 
            placeholderText="Select a starting date/time"
            />
            <label>End date</label>
            <DatePicker 
            className="calendar"
            selected={this.state.endDate} 
            onChange={this.changeEndHandler}
            inline
            showMonthDropdown
            showYearDropdown
            showTimeInput
            timeCaption="Time Governor"  
            placeholderText="Select an ending date/time"
            />
            <TextInput name="event_duration" onChange={this.changeHandler} label={this.state.formControls.event_duration.label} valid={this.state.formControls.event_duration.valid} formValid={this.state.formValid} options={this.state.formControls.event_duration.options} placeholder={"(HH:MM)"} onFocus={(e) => e.target.placeholder = ""} onBlur={(e => e.target.placeholder = "(HH:MM)")}/>

            <button onClick={this.formSubmitHandler} > Submit </button>
            </div>
            <Modal show={this.state.showError} onHide={this.handleModalClose}>
            <Modal.Header closeButton>
            <Modal.Title>Error</Modal.Title>
            </Modal.Header>
            <Modal.Body>{this.state.showTimeError ? "Please enter a valid time" : "Please fill out all required fields"}</Modal.Body>
            <Modal.Footer>
            <Button variant="secondary" onClick={this.handleModalClose}>Close</Button>
            </Modal.Footer>
            </Modal>
            </>
        );
    }
}