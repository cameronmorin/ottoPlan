import React, { useState } from 'react';
import firebase from "firebase";
import "../style/sidebar.css";
import { Modal } from 'react-bootstrap';

import EventForm from './EventForm'

//Import Material Components
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import Collapse from "@material-ui/core/Collapse";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Divider from "@material-ui/core/Divider";

function SidebarItem({ depthStep = 10, depth = 0, expanded, item, ...rest }) {
    const [collapsed, setCollapsed] = React.useState(true);
    const { label, items, Icon, onClick: onClickProp } = item;
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    //const handleShow = () => setShow(true);
  
    function toggleClose() {
      setCollapsed(previous => !previous);
    }
  
    function onClick(e) {
      if (item.label === "Sign Out") {
        firebase.auth().signOut();
      }
      if (item.label === "Create Event"){
        setShow(true);
      }
      if (Array.isArray(items)) {
        toggleClose();
      }
      if (onClickProp) {
        onClickProp(e, item);
      }
    }
  
    let expandedIcon;
  
    if (Array.isArray(items) && items.length) {
      expandedIcon = !collapsed ? (
        <ExpandLessIcon className={"expand-arrow"} />
      ) : (
        <ExpandMoreIcon className={"expand-arrow"} />
      );
    }
  
    return (
      <>
        {/* backdrop="static" supposed to prevent clicking out, but not working for some reason*/}
        <Modal backdrop="static" show={show} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Create an Event</Modal.Title>
            </Modal.Header>
            <Modal.Body> <EventForm /> </Modal.Body>
        </Modal>
        <ListItem
          className="sidebar-item"
          onClick={onClick}
          button
          dense
          {...rest}
        >
          <div
            style={{ paddingLeft: depth * depthStep }}
            className="sidebar-item-stuff"
          >
            {Icon && <Icon className="sidebar-item-icon" />}
            <div className="sidebar-item-text">{label}</div>
          </div>
          {expandedIcon}
        </ListItem>
  
        <Collapse in={!collapsed} timeout="auto" unmountOnExit>
          {Array.isArray(items) ? (
            <List disablePadding dense>
              {items.map((subItem, index) => (
                <React.Fragment key={`${subItem.name}${index}`}>
                  {subItem === "divider" ? (
                    <Divider style={{ margin: "10px 0" }} />
                  ) : (
                    <SidebarItem
                      depth={depth + 1}
                      depthStep={depthStep}
                      item={subItem}
                    />
                  )}
                </React.Fragment>
              ))}
            </List>
          ) : null}
        </Collapse>
      </>
    );
  }

export default SidebarItem;