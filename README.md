
# SVMP REST API


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
 {authtoken: 'sometoken',
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

### Users

GET `/api/users`


### Account

POST `/api/user/change_passwd`

