import React from 'react';
import '../style/App.css';

const TextInput = props => {
    let formControl = "form-control";

    //change display of form based on inputs
    if (props.touched && !props.valid) {
        formControl = 'form-control control-error';
    }
    
    const label = props.name.charAt(0).toUpperCase() + props.name.substring(1);

    return (
        <div classname="form-group">
            <label>{label}</label>
            <input type="text" className={formControl} {...props}/>
        </div>
    );
}

export default TextInput;