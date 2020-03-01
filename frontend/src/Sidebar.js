import React from 'react'
import firebase from 'firebase'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Divider from "@material-ui/core/Divider";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import Collapse from "@material-ui/core/Collapse";
import './sidebar.css'


function SidebarItem({ depthStep = 10, depth = 0, expanded, item, ...rest }) {
    const [collapsed, setCollapsed] = React.useState(true);
    const { label, items, Icon, onClick: onClickProp } = item;

    function toggleClose() {
        setCollapsed(previous => !previous);
    }

    function onClick(e) {
        if (item.label === 'Sign Out') {
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
                                <Divider style={{margin: "10px 0"}} />
                            ) : (
                                <SidebarItem
                                  depth={depth+1}
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
  
function Sidebar({ items, depthStep, depth, expanded }) {
    return (
        <div className="sidebar">
            <List disablePadding dense>
                {items.map((sidebarItem, index) => (
                    <React.Fragment key={`${sidebarItem.name}${index}`}>
                        {sidebarItem === "divider" ? (
                            <Divider style={{margin: "6px 0"}} />
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

export default Sidebar