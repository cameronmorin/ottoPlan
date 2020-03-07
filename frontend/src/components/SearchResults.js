import React from 'react';
import backend from '../service/firebase';
import '../style/SearchResults.css';

export default class SearchResults extends React.Component {
  constructor(props) {
    super(props);
    console.log(props);
  }

  componentDidMount() {
    console.log('Search Results props: ', this.props);
  }

  render() {
    return(
      <>
        {this.props.results ? 
          this.props.results.map((data, key) => (
            <div className='search-results'>
              <img src={data.photoURL} alt='img' style={{height: '30px', borderRadius: '50%'}} />
              <p>{data.email}</p>
            </div>
          ))
          // <p>We have results</p>
          :
          <p>No Results</p>
        }
      </>
    );
  }
}