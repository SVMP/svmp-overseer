var
    assert = require('assert'),
    app = require('supertest')('http://localhost:3000');


describe("Authentication", function () {

    it('should login user and return token in body', function (done) {
        app.post('/login')
            .send({username: 'dave', password: 'dave12345678'})
            .expect(function(res) {
                assert.ok(res.body.authtoken);
                assert.ok(res.body.webrtc);
            })
            .expect(200, done);
    });

    it('should fail if missing a required field', function (done){
        app.post('/login')
            .send({username: 'dave'})
            .expect(400, done)
    });

    it('should fail on bad username/password', function(done) {
        app.post('/login')
            .send({username: 'bad', password: 'bad'})
            .expect(401, done);
    });
});
