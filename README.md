
# SVMP Overseer

Serves as a central controller, login, and RESTful API server for SVMP.
Includes a web console and an HTML5 web client.

[![Build Status](https://travis-ci.org/SVMP/svmp-overseer.svg?branch=master)](https://travis-ci.org/SVMP/svmp-overseer)

## Setup

### Prerequisites

* Install [Node.js](http://nodejs.org)
* Install [MongoDB](http://docs.mongodb.org/manual/installation/)

### Install Steps

1. Download this project
2. Within the root directory of this project, run these commands to install the project and download dependencies:

 ```sh
 $ sudo npm install -g grunt-cli
 $ sudo npm install -g bower
 $ npm install
 ```

## Quick Start

If you haven't used MongoDB yet, make sure it's running. Then, set your Node environment to production mode:
```sh
$ export NODE_ENV=production
```

On first run, the configuration file will be created. Run the server:
```sh
$ node server.js
```

Now, press **Ctrl+C** to close the server. Open the newly-generated `./config/config-local.js` file and set your private settings here. Choose which cloud environment you will use and set the appropriate cloud configuration accordingly.

To set up TLS encryption with self-signed certificates:

1. Modify the `./tls/*.cnf` files to match your SVMP Overseer and SVMP Server information. **Important: change the passwords from the defaults!**
2. Modify the `./tls/Makefile`, change the `SERVER_PASSPHRASE` and `OVERSEER_PASSPHRASE` values to match your new passwords.
3. Generate the self-signed certificates:

    ```sh
    $ make -C ./tls/
    ```

Run tests to make sure they pass:
```sh
$ grunt
```

Finally, start the server:
```sh
$ node server.js
```

Using a web browser, navigate to the root URL to access the web console (e.g. *https://your-hostname:3000*)

## API

All requests with a URL prefix of `/api` and `/services` **must** contain a JSON Web Token (JWT) in the request header, in the form:
`svmp-authtoken : 'sometoken'`

Requests to URLs with a `/services` prefix *must* have the role `admin` in the JWT.
You can use Grunt to generate a services token. For more details, run the following command:
```sh
$ node create-token.js
```

### User Clients
#### Login

POST `/login`

**Request**
```javascript
{ username: 'un',
  password: 'pw'
}
```

**Response**

* *200* OK - Body:
    ```javascript
    { sessionInfo: {
        token: 'token',
        maxLength: 36000
      },
      server: {
        host: 'svmp-server.example.com'
        port: 8002
      },
      webrtc: {...}
    }
    ```

 Token is a JWT that can be used to authenticate with an SVMP proxy server, with a payload that includes:
    ```javascript
    { sub: 'user._id',
      role: 'user|admin',
      exp: 'expiration time',
      jti: 'username-uuid'
    }
    ```

* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad username/password combination
* *403* Forbidden - The user needs to change their password before proceeding
* *500* Internal Server Error - Unable to complete request

#### Change Password

POST `/changePassword`

**Request**
```javascript
{ password: 'hello',
  newPassword: 'thisismynewsecurepassword'
}
```

**Response**
* *200* OK - Includes same body as `/login` response
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad username/password combination
* *500* Internal Server Error - Unable to complete request

### Service - Users

Requests to URLs with a `/services` prefix *must* have the role `admin` in the authentication token.  Requests to 
Services do not require a login.  Clients must be pre-configured with proper authentication tokens.
You can use Grunt to generate a services token. See `grunt create-service-token`

#### List Users

GET `/services/users`

**Response**
* *200* OK - Body: `{ users: [{...}, {...}, ...] }`
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

#### Add User

POST `/services/user`

**Request**
```javascript
{ user: {
    username: 'un',
    password: 'pw',
    email: 'new@here.com',
    device_type: 'device_1'
  }
}
```

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

#### Delete User

DELETE `/services/user/:username`

where `:username` is the actual user's name

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *404* Not Found - User does not exist
* *500* Internal Server Error - Unable to complete request

#### Update User

PUT `/services/user/:username`

where `:username` is the actual user's name

**Request**
```javascript
{ username: 'un',
  // Field(s) to update
  update: {'email': 'new@here.com'}
}
```

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *404* Not Found - User does not exist
* *500* Internal Server Error - Unable to complete request

#### Find User

GET `/services/user/:username`

where `:username` is the actual user's name

**Response**
* *200* OK - Body: `{ user: {...} }`
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *404* Not Found - User does not exist
* *500* Internal Server Error - Unable to complete request

### Service - VM Session Management
#### Create VM Session

POST `services/vm-session`

**Request**
```javascript
{ username: 'un',
  expireAt: Date
}
```

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

#### Update VM Session

PUT `services/vm-session`

**Request**
```javascript
{ username: 'un',
  lastAction: Date
}
```

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

### Service - Cloud
#### Setup VM

Setup a VM for user. Usually done during login

GET `/services/cloud/setupVm/:username`

where `:username` is the actual user's name

**Response**
* *200* OK - Body: `{ vm_ip: 'ip address', vm_port: 'port number of vm' }`
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

#### List Device Types

GET `/services/cloud/devices`

**Response**
* *200* OK - Body: `{ device_1: 'imageID', device_2: 'imageID', ... }`
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

#### List Volumes

GET `/services/cloud/volumes`

**Response**
* *200* OK - Body: `{ volumes: [...] }`
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

#### Create Volume for User

POST `/services/cloud/volume/create`

**Request**
```javascript
{ username: 'un' }
```

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *404* Not Found - User does not exist
* *500* Internal Server Error - Unable to complete request

#### Assign Volume to User

POST `/services/cloud/assignVolume`

**Request**
```javascript
{ username: 'un',
  volid: 'volume ID'
}
```

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *404* Not Found - User does not exist
* *500* Internal Server Error - Unable to complete request

#### Create/Start VM for User

GET `/services/cloud/setupVm/:username`

where `:username` is the actual user's name

**Response**
* *200* OK - Empty body
* *400* Bad Request - Missing required field(s)
* *401* Unauthorized - Bad token or insufficient permissions
* *404* Not Found - User does not exist
* *500* Internal Server Error - Unable to complete request

#### List Images and Flavors

GET `/services/cloud/images`

**Response**
* *200* OK - Body: `{ flavors: [...], images: [...] }`
* *401* Unauthorized - Bad token or insufficient permissions
* *500* Internal Server Error - Unable to complete request

## License
Copyright (c) 2012-2014, The MITRE Corporation, All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.