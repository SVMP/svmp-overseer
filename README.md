
# SVMP REST API

## Setup

* Install dependencies: `> npm install` 
* You need mongodb

## Run tests

* Start mongodb
* `> node server.js`
* `> grunt`


## API

### Authenticate

POST `/login` 

Request:

```
 {username: 'un', password: 'pw }
```

Response:

Status: 200

```
 {
   authtoken: 'sometoken',
   
   expiresAt: 'future time in seconds'
   
   server: {
      host: 'svmp-server.example.com'
      port: 8002
   },
   
   webrtc: {}
 }
```

Status: 400  Bad Request

Status: 401 Unauthorized


### Authorized header token

All requests with a URL prefix of `/api` **must** contain a request header in the form:

`svmp-authtoken: 'sometoken'`

valid tokens are returned on successful login. See login Response above.


### User


#### Change Password

POST `/api/user/passwd`

Request

```
 {
   old_password: 'hello',
   new_password: 'thisismynewsecurepassword'
 }
```

Response:

Status 200  ok

Status 400  Bad Request

Status 401 Unauthorized


### Services

Any calls to a URL with an `/admin` prefix, must pass a pre-generated token containing the role `admin`. These services
are not required to login and do not contain a database user account.  You can use Grunt to generate a services token.
See `grunt service-token`







