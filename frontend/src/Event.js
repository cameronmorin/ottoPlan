import React, {Component } from "react";
import axios from "axios";

export default class event extends Component {
    constructor() {
        super();
        this.state = {
            "success": "false",
            "event_info": {
                "summary": "",
                "location": "",
                "description": "",
                "attendees": [
                    { "email": ""},
                    { "email": ""}
                ]
            },
            "scheduling_info": {
                "event_duration": "",
                "time_zone": "",
                "start_date": "",
                "end_date": "",
                "start_time": "",
                "end_time": ""
            }
        };
    }

    componentDidMount = () => {
        axios.get("/schedule_event")
          .then(response => {
              //console.log(response.data.success);
              this.state = JSON.stringify(response.data);
              console.log('this.state: ' + this.state);
              /* The state in render is not getting update, likely due to the issue described here:
               * https://reactjs.org/docs/react-component.html#setstate
               */
              /*this.setState({
                  success: response.data.success
              });*/
          });
    };

    render() {
        return(
            <div>
                <h1>success = {this.state.success}</h1>
            </div>
        );
    }
}
