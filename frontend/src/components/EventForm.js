import React, { useState } from 'react'
import '../style/App.css';

import TextInput from './TextInput';
import validate from './validation';
import Select from './SelectOption';

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

class EventForm extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            formValid: true,
            showError: false,
            
            formControls: {
                summary: {
                    value: '',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: true
                    },
                    from: 'event'
                },
                location: {
                    value: '',
                    valid: true,
                    touched: false,
                    validationRules: {
                        isRequired: false
                    },
                    from: 'event'
                },
                description: {
                    value: '',
                    initVal: 'Description of event',
                    valid: true,
                    touched: false,
                    validationRules: {
                        isRequired: false
                    },
                    from: 'event'
                },    
                attendees: {
                    value: '',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: true
                    },
                    from: 'event'     
                },
                event_duration: {
                    value: 'Select a duration for the event',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: true
                    },
                    options: [
                        {value: '15', display: '15 minutes'},
                        {value: '30', display: '30 minutes'},
                        {value: '45', display: '45 minutes'},
                        {value: '60', display: '1 hour'},
                        {value: '75', display: '1 hour 15 minutes '},
                        {value: '90', display: '1 hour 30 minutes'},
                        {value: '105', display: '1 hour 45 minutes'},
                        {value: '120', display: '2 hours'},
                    ],
                    from: 'schedule',
                    duration: { hr: '', min: ''},
                },

                timezone: {
                    value: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    valid: true,
                    touched: false,
                    validationRules: {
                        isRequired: false,
                    },
                    options: [
                        {value: "America/Chicago", display: 'America/Chicago'},
                        {value: "America/Denver", display: 'America/Denver'},
                        {value: "America/Detroit", display: 'America/Detroit'},
                        {value: "America/Indiana", display: 'America/Indiana'},
                        {value: "America/Kentucky", display: 'America/Kentucky'},
                        {value: "America/Los_Angeles", display: 'America/Los_Angeles'},
                        {value: "America/New_York", display: 'America/New_York'},
                        {value: "America/Phoenix", display: 'America/Phoenix'},
                    ],
                    from: 'schedule',
                }
            },

            startDate: new Date(2020, 0, 26, 9),
            endDate: new Date(2020, 0, 26, 9)
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

    //handler for submit/making json
    formSubmitHandler = () => {
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
        this.setState({formValid: formValid});
        
        if(formValid === false) {
            this.setState({ showError: true });
        }
        else {  //populate JSON for backend
            for(let y in this.state.formControls) {
                if(this.state.formControls[y].from === 'event') {
                    data.event_info[y] = this.state.formControls[y].value;
                }
            }

            data.schedule_info["duration"] = {hr: '', min: ''};

            let hour = -1;
            let val = this.state.formControls["event_duration"].value
            while (val > 0) {
                val -= 60;
                hour += 1;
            }
            data.schedule_info["duration"].hr = hour.toString();
            data.schedule_info["duration"].min = (this.state.formControls["event_duration"].value % 60).toString();

            data.schedule_info["start_date"] = this.state.startDate;
            data.schedule_info["end_date"] = this.state.endDate;
            data.schedule_info["timezone"] = this.state.formControls["timezone"].value;  
            
            //event info to send to backend
            alert(JSON.stringify(data, null, 2));
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
                <TextInput name="attendees" initVal = {this.state.formControls.attendees.initVal} value={this.state.formControls.attendees.value} onChange={this.changeHandler} valid={this.state.formControls.attendees.valid} formValid={this.state.formValid}/>
                {/*schedule_info
                   TODO: fix format (grid?), add validation for dates*/}
                <Select name="timezone" initVal = {this.state.formControls.timezone.initVal} value={this.state.formControls.timezone.value} onChange={this.changeHandler} valid={this.state.formControls.timezone.valid} formValid={this.state.formValid} options={this.state.formControls.timezone.options}/>
                <label>Start Date</label>
                <DatePicker 
                    // selected={this.state.startDate} 
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
                    // selected={this.state.endDate} 
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
                <Select name="event_duration" initVal= {this.state.formControls.event_duration.initVal} hr={this.state.formControls.event_duration.duration.hr} min={this.state.formControls.event_duration.duration.min} onChange={this.changeHandler} display={this.state.formControls.event_duration.display} valid={this.state.formControls.event_duration.valid} formValid={this.state.formValid} options={this.state.formControls.event_duration.options}/>
            
                <button onClick={this.formSubmitHandler} > Submit </button>
            </div>
            <Modal show={this.state.showError} onHide={this.handleModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Error</Modal.Title>
                </Modal.Header>
                <Modal.Body>Please fill out all required fields</Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={this.handleModalClose}>Close</Button>
                </Modal.Footer>
            </Modal>
          </>
        );
    }
}

export default EventForm;