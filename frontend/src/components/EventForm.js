import React from 'react'
import '../style/App.css';

import TextInput from './TextInput';
import validate from './validation';
import Select from './SelectOption';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
            formValid: false,
            
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

        //change value of valid after checking if required
        updatedFormElement.value = value;
        updatedFormElement.touched = true;
        updatedFormElement.valid = validate(value, updatedFormElement.validationRules);

        updatedControls[name] = updatedFormElement;

        let formValid = true;
        for (let x in updatedControls) {
            //this.setState({formValid: updatedControls[x].valid && formValid});
            if(updatedControls[x].valid === false) formValid = false;
        }

        this.setState({
            formControls: updatedControls,
            formValid: formValid
        });
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

    //handler for submit/making json
    formSubmitHandler = () => {
        const event_info = {};
        const schedule_info = {};
        const data = {event_info, schedule_info};

        for(let id in this.state.formControls) {
            if (this.state.formControls[id].from === 'event') {
                data.event_info[id] = this.state.formControls[id].value;
            }
            // else {
            //     data.schedule_info[id] = this.state.formControls[id].value;
            // }
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

        //event info
        alert(JSON.stringify(data, null, 2));
    }

    render () {
        return (
            <div className="event-form">
                {/*event_info*/}
                <label className="form-title">Create an Event</label>
                <TextInput name="summary" initVal = {this.state.formControls.summary.initVal} value={this.state.formControls.summary.value} onChange={this.changeHandler} valid={this.state.formControls.summary.valid} touched={this.state.formControls.summary.touched}/>
                <TextInput name="location" initVal = {this.state.formControls.location.initVal} value={this.state.formControls.location.value} onChange={this.changeHandler} valid={this.state.formControls.location.valid} touched={this.state.formControls.location.touched}/>
                <TextInput name="description" initVal = {this.state.formControls.description.initVal} value={this.state.formControls.description.value} onChange={this.changeHandler} valid={this.state.formControls.description.valid} touched={this.state.formControls.description.touched}/>
                <TextInput name="attendees" initVal = {this.state.formControls.attendees.initVal} value={this.state.formControls.attendees.value} onChange={this.changeHandler} valid={this.state.formControls.attendees.valid} touched={this.state.formControls.attendees.touched}/>
                {/*schedule_info
                   TODO: fix format (grid?), add validation for dates*/}
                <Select name="timezone" initVal = {this.state.formControls.timezone.initVal} value={this.state.formControls.timezone.value} onChange={this.changeHandler} valid={this.state.formControls.timezone.valid} touched={this.state.formControls.timezone.touched} options={this.state.formControls.timezone.options}/>
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
                <Select name="event_duration" initVal= {this.state.formControls.event_duration.initVal} hr={this.state.formControls.event_duration.duration.hr} min={this.state.formControls.event_duration.duration.min} onChange={this.changeHandler} display={this.state.formControls.event_duration.display} valid={this.state.formControls.event_duration.valid} touched={this.state.formControls.event_duration.touched} options={this.state.formControls.event_duration.options}/>
            
                <button onClick={this.formSubmitHandler} disabled={!this.state.formValid}> Submit </button>
            </div>
        );
    }
}

export default EventForm;