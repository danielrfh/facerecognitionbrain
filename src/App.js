import React, { Component } from "react";
import Navigation from "./components/Navigation/Navigation";
import FaceRecognition from "./components/FaceRecognition/FaceRecognition";
import Logo from "./components/Logo/Logo";
import Signin from "./components/Signin/Signin";
import Register from "./components/Register/Register";
import ImageLinkForm from "./components/ImageLinkForm/ImageLinkForm";
import Rank from "./components/Rank/Rank";
import ParticlesBg from "particles-bg";
import "./App.css";
// import { click } from "@testing-library/user-event/dist/click";

const returnClarifaiRequestOptions = (imageUrl) => {
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // In this section, we set the user authentication, user and app ID, model details, and the URL
  // of the image we want as an input. Change these strings to run your own example.
  //////////////////////////////////////////////////////////////////////////////////////////////////

  // Your PAT (Personal Access Token) can be found in the portal under Authentification
  const PAT = "d7bc774fde8a4850af4ac59501f89928";
  // Specify the correct user_id/app_id pairings
  // Since you're making inferences outside your app's scope
  const USER_ID = "danielrfh";
  const APP_ID = "my-first-application-twtjtb";

  const IMAGE_URL = imageUrl;
  ///////////////////////////////////////////////////////////////////////////////////
  // YOU DO NOT NEED TO CHANGE ANYTHING BELOW THIS LINE TO RUN THIS EXAMPLE
  ///////////////////////////////////////////////////////////////////////////////////
  const raw = JSON.stringify({
    user_app_id: {
      user_id: USER_ID,
      app_id: APP_ID,
    },
    inputs: [
      {
        data: {
          image: {
            url: IMAGE_URL,
          },
        },
      },
    ],
  });
  const requestOptions = {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: "Key " + PAT,
    },
    body: raw,
  };
  return requestOptions;
};

// Initialize all states to be used across all Components
const initialState = {
  input: "",
  imageUrl: "",
  box: {},
  route: "signin",
  isSignedIn: false,
  user: {
    id: "",
    name: "",
    email: "",
    entries: 0,
    joined: "",
  },
};

class App extends Component {
  constructor() {
    super();
    this.state = initialState;
  }

  loadUser = (data) => {
    this.setState({
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        entries: data.entries,
        joined: data.joined,
      },
    });
  };

  // The API response contains the % of where the face is located in the
  // image. Therefore we need to multiply it in order to find the pixel
  // coordinates for the box.
  calculateFaceLocation = (data) => {
    const clarifaiFace =
      data.outputs[0].data.regions[0].region_info.bounding_box;
    const image = document.getElementById("inputImage");
    const width = Number(image.width);
    const height = Number(image.height);
    // console.log(width);
    // console.log(height);
    // console.log(clarifaiFace);
    return {
      leftCol: clarifaiFace.left_col * width,
      topRow: clarifaiFace.top_row * height,
      rightCol: width - clarifaiFace.right_col * width,
      bottomRow: height - clarifaiFace.bottom_row * height,
    };
  };

  // Function that gets the coordinates from of the calculated face
  // location and sets the state of box with it. This is used in the
  // FaceRecognition Component.
  displayFaceBox = (box) => {
    // console.log(box);
    this.setState({ box: box });
  };

  // Create a function that receives an event when the input changes on
  //the ImageLinkForm Component
  onInputChange = (event) => {
    // console.log(event.target.value);
    this.setState({ input: event.target.value });
  };

  onButtonSubmit = () => {
    // console.log("click");
    this.setState({ imageUrl: this.state.input });

    // Change these to whatever model and image URL you want to use
    const MODEL_ID = "face-detection";
    // app.models.predict(MODEL_ID, this.state.input) <- Old API

    // NOTE: MODEL_VERSION_ID is optional, you can also call prediction with the MODEL_ID only
    // https://api.clarifai.com/v2/models/{YOUR_MODEL_ID}/outputs
    // this will default to the latest version_id

    // Call Clarifai API using the URL on this.state.input
    fetch(
      "https://api.clarifai.com/v2/models/" + MODEL_ID + "/outputs",
      returnClarifaiRequestOptions(this.state.input)
    )
      // Fetch does not directly return the JSON response body but instead
      // returns a promise that resolves with a Response object.
      .then((response) => {
        // console.log(response);

        // The Response object, in turn, does not directly contain the
        // actual JSON response body but is instead a representation of
        // the entire HTTP response. So, to extract the JSON body content
        // from the Response object, we use the json() method, which
        // returns a second promise that resolves with the result of
        // parsing the response body text as JSON
        response.json().then((data) => {
          // Access the object in the 'data' variable
          // console.log(this.calculateFaceLocation(data));
          if (data) {
            fetch("http://localhost:4000/image", {
              method: "put",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: this.state.user.id }),
            })
              .then((response) => response.json())
              .then((count) => {
                this.setState(
                  Object.assign(this.state.user, { entries: count })
                );
              })
              .catch(console.log);
          }
          this.displayFaceBox(this.calculateFaceLocation(data));
        });
      })
      // .then((result) => console.log(result))
      .catch((error) => console.log("error", error));
  };

  onRouteChange = (route) => {
    if (route === "signout") {
      this.setState(initialState);
    } else if (route === "home") {
      this.setState({ isSignedIn: true });
    }
    this.setState({ route: route });
  };

  render() {
    const { isSignedIn, imageUrl, route, box } = this.state;
    return (
      <div className="App">
        <ParticlesBg type="cobweb" bg={true} /> {/* Used for background */}
        <Navigation // Create a Navigation Component is where we have
          // the signout
          isSignedIn={isSignedIn}
          onRouteChange={this.onRouteChange}
        />
        {route === "home" ? (
          <div>
            <Logo /> {/* Create a Logo Component*/}
            {/* Create a Rank Component to compare all the users */}
            <Rank
              name={this.state.user.name}
              entries={this.state.user.entries}
            />
            <ImageLinkForm // Create an input form Component for the image URL
              onInputChange={this.onInputChange} // Props for the Component
              onButtonSubmit={this.onButtonSubmit}
            />
            {/* Create a Component to display the image from imageUrl
            and draw a box in the recognized face with the coordinates 
            (box) from the API */}
            <FaceRecognition box={box} imageUrl={imageUrl} />
          </div>
        ) : route === "signin" ? (
          <Signin loadUser={this.loadUser} onRouteChange={this.onRouteChange} />
        ) : (
          <Register
            loadUser={this.loadUser}
            onRouteChange={this.onRouteChange}
          />
        )}
      </div>
    );
  }
}

export default App;
