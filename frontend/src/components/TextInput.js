import React from 'react';
import '../style/App.css';

const TextInput = props => {
    let formControl = "form-control";
    let showError = false;

    //change display of form based on inputs
    if (!props.formValid && !props.valid) {
        formControl = 'form-control control-error';
        showError = true;
    }

    let label = (props.name.charAt(0).toUpperCase() + props.name.substring(1)).replace('_', ' ');

    //add specifications for event duration label
    if (props.name === 'event_duration') label = label.concat(" (hh:mm)");

    return (
        <div classname="form-group">
            <label>{label}</label>
            {showError ? <label  style={{ color: 'red', fontSize: '10px'}}>&nbsp;&nbsp;&nbsp;*Required</label> : null}
            <input type="text" className={formControl} {...props}/>
            {/* <textarea className={formControl} {...props}/>  */}
        </div>
    );
}

export default TextInput;