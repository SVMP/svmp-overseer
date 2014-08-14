
# SVMP REST API

## Setup

* Install dependencies: `> npm install` 
* You need mongodb

## Run tests

* Start mongodb
* `> node server.js`
* `> grunt`


## API

### Authorized header token

All requests with a URL prefix of `/api` and `/services` **must** contain a request header in the form:

`svmp-authtoken : 'sometoken'`

valid tokens are returned on successful login. Token payload includes: username, role, expiresAt

### User Clients
#### Login

POST `/login`

Authenticate the User

**Request**

```javascript
 {username: 'un', password: 'pw' }
```

**Response**


*200*

token is a JWT token with a payload that includes:

```javascript
 {
   'sub': 'user._id',
   'username': 'username',
   'role': 'user|admin',
   'iss': 'https:// restserver.com',
   'exp': 'expiration time',
   'jti': 'username-uuid'
 }
```

```javascript
 {
   sessionInfo: {
                  token: token,
                  maxLength: max_session,
                  gracePeriod: svmp.config.get('settings:session_token_ttl')
   },
   server: {
      host: 'svmp-server.example.com'
      port: 8002
   },
   
   webrtc: {}
 }
```



*400* Bad Request - Missing required fields

*401* Unauthorized

*403* Forbidden - set if the user needs to change password

#### Change Password

POST `/api/user/changePasswd`

Change Password

**Request**

```javascript
 {
   password: 'hello',
   new_password: 'thisismynewsecurepassword'
 }
```

**Response**

*200*  ok

*400*  Bad Request

*401* Unauthorized


### Services

Requests to URLs with a `/services` prefix *must* have the role `admin` in the authentication token.  Requests to 
Services do not require a login.  Clients must be pre-configured with proper authentication tokens.
You can use Grunt to generate a services token. See `grunt create-service-token`

#### User(s)
##### List Users

GET `/services/users`

**Response**

*200*

List of users

```javascript
 {users: [{},{}]
```

*500* Error encountered listing users

##### Add User

POST `/services/user`

**Request**

```javascript
 {user: {
    username: '',
    password: '',
    email: '',
    devices_type: ''
   }
 }
```

**Response**

*200* on success

*400* missing required fields

*500* Error creating the User


##### Delete User

DELETE `/services/user/:username`

where `:username` is the actual user's name

**Response**

*200* on success

*400* missing username

*404* User not found


##### Update User

PUT `/services/user/:username`

where `:username` is the actual user's name

**Request**

```javascript
 { 
   username: 'username of person to update'
   // Fields to update
   update: {'email': 'new@here.com'}
 }
```

##### Find User

GET `/services/user/:username`

where `:username` is the actual user's name

**Response**

*200*

```javascript
 { user: {} }
```

*500* Error encountered getting User

*400* Bad Request (maybe missing username)


#### Cloud
##### Setup VM

Setup a VM for user. Usually done during login

GET `/services/cloud/setupVm/:username`

where `:username` is the actual user's name


**Response**

*200*

```javascript
 {
   vm_ip: 'ip address',
   vm_port: 'port number of vm'
 }
```

*500*
  May be a result of a problem creating/starting VM
  
##### List Device Types

GET `/services/cloud/devices`

##### List Volumes

GET `/services/cloud/volumes`

##### Create Volume for User

POST `/services/cloud/volume`

##### Assign Volume to User

POST `/services/cloud/assignVolume`

##### Create/Start VM for User

POST `/services/cloud/startVM`

##### Register VM to User

POST `/services/cloud/assignVm`

##### List Images and Flavors

GET `/services/cloud/images`






