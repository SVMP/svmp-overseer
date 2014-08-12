

exports.testAdmin = function(req,res) {
    console.log(req.user);
    res.json(200,{});
};

exports.setUpVm = function(req,res) {

};