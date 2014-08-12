var
    assert = require('assert'),
    app = require('supertest')('http://localhost:3000');


describe("Users", function () {

    /*it('should return list of users if request has a valid token', function (done) {
        app.post('/login')
            .send({username: 'dave', password: 'dave12345678'})
            .end(function(err,res){
                // Now check they can access stuff with token
                app.get('/api/users')
                    .set('svmp-authtoken',res.body.authtoken)
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.users.length,1);
                    })
                    .end(done);
            });
    });

    it('should fail to get list of Users on an invalid token', function (done) {
        app.post('/login')
            .send({username: 'dave', password: 'dave12345678'})
            .end(function(err,res){
                // Now check they can access stuff with token
                app.get('/api/users')
                    .set('svmp-authtoken','badtoken')
                    .expect(401)
                    .end(done);
            });
    });*/

    it('should change users password', function(done) {
        app.post('/login')
            .send({username: 'dave', password: 'dave12345678'})
            .end(function(err,res){
                // Now check they can access stuff with token
                app.post('/api/user/passwd')
                    .set('svmp-authtoken',res.body.authtoken)
                    .send({
                        old_password: 'dave12345678',
                        new_password: 'dave22222222'
                    })
                    .expect(function(res){
                        assert.equal(res.statusCode,200);
                    })
                    .end(done);
            });
    });

});
