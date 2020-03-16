import React from "react";
import firebase from "firebase";
import "../style/sidebar.css";

// Import Material Components
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Divider from "@material-ui/core/Divider";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import Collapse from "@material-ui/core/Collapse";

// Import Material Icons
import HomeIcon from '@material-ui/icons/Home';
import SettingsIcon from '@material-ui/icons/Settings';
import FriendIcon from '@material-ui/icons/People';
import AccountIcon from '@material-ui/icons/AccountBox';
import SignoutIcon from '@material-ui/icons/ExitToApp';
import EventIcon from '@material-ui/icons/Event';
import NotifIcon from '@material-ui/icons/Notifications';
import UnreadIcon from '@material-ui/icons/NotificationImportant';

var unread = false;
const items = [
  { name: 'home', label: 'Home', Icon: HomeIcon},
  { name: 'friends', label: 'Friends', Icon: FriendIcon},
  { name: 'create event', label: 'Create Event', Icon: EventIcon},
  { name: 'notifications', label: 'Notifications', Icon: unread ? UnreadIcon : NotifIcon},
  { 
    name: 'settings', 
    label: 'Settings',
    Icon: SettingsIcon,
    items: [
             {name: 'account', label: 'Account', Icon: AccountIcon},
             {name: 'sign out', label: 'Sign Out', Icon: SignoutIcon},
           ],
  },
]


function SidebarItem({ depthStep = 10, depth = 0, expanded, item, ...rest }) {
  const [collapsed, setCollapsed] = React.useState(true);
  const { label, items, Icon, onClick: onClickProp } = item;

  function toggleClose() {
    setCollapsed(previous => !previous);
  }

  function onClick(e) {
    if (item.label === "Sign Out") {
      firebase.auth().signOut();
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

function Sidebar({ photo, depthStep, depth, expanded }) {
  return (
    <div className="sidebar">
      <List disablePadding dense>
        <img alt='profile pic' src={photo} className='sidebar-item profile-pic' />
        {items.map((sidebarItem, index) => (
          <React.Fragment key={`${sidebarItem.name}${index}`}>
            {sidebarItem === "divider" ? (
              <Divider style={{ margin: "6px 0" }} />
            ) : (
              <SidebarItem
                depth={depth}
                depthStep={depthStep}
                expanded={expanded}
                item={sidebarItem}
              />
            )}
          </React.Fragment>
        ))}
      </List>
    </div>
  );
}

export default Sidebar;
