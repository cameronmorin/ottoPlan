import React from 'react'
import TextInput from './TextInput';
import validate from './validation';
import './style/App.css';

class EventForm extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            formValid: false,

            formControls: {
                summary: {
                    value: '',
                    initVal: 'Summary of the event',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: true
                    }
                },
                location: {
                    value: '',
                    initVal: 'Location of event',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: false
                    }
                },
                description: {
                    value: '',
                    initVal: 'Description of event',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: false
                    }
                },    
                attendees: {
                    value: '',
                    valid: false,
                    touched: false,
                    validationRules: {
                        isRequired: true
                    }        
                },
            }
        }
    }

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
            formValid = updatedControls[x].valid && formValid;
        }

        this.setState({
            formControls: updatedControls,
            formValid: formValid
        });
    }

    formSubmitHandler = () => {
        const data = {};

        for(let id in this.state.formControls) {
            data[id] = this.state.formControls[id].value;
        }

        //event info
        alert(JSON.stringify(data, null, 2));
    }

    render () {
        return (
            <div>
                <TextInput name="summary" initVal = {this.state.formControls.summary.initVal} value={this.state.formControls.summary.value} onChange={this.changeHandler} valid={this.state.formControls.summary.valid} touched={this.state.formControls.summary.touched}/>
                <TextInput name="location" initVal = {this.state.formControls.location.initVal} value={this.state.formControls.location.value} onChange={this.changeHandler} valid={this.state.formControls.location.valid} touched={this.state.formControls.location.touched}/>
                <TextInput name="description" initVal = {this.state.formControls.description.initVal} value={this.state.formControls.description.value} onChange={this.changeHandler} valid={this.state.formControls.description.valid} touched={this.state.formControls.description.touched}/>
                <TextInput name="attendees" initVal = {this.state.formControls.attendees.initVal} value={this.state.formControls.attendees.value} onChange={this.changeHandler} valid={this.state.formControls.attendees.valid} touched={this.state.formControls.attendees.touched}/>

                <button onClick={this.formSubmitHandler} disabled={!this.state.formValid}> Submit </button>
            </div>
        );
    }
}

export default EventForm;