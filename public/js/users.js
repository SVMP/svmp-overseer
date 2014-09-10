/*
 * Copyright 2014 The MITRE Corporation, All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this work except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Dave Bryson
 *
 */
'use strict';

// Config HTTP Error Handling
angular.module('users').config(['$httpProvider',
    function ($httpProvider) {
        // Set the httpProvider "not authorized" interceptor
        $httpProvider.interceptors.push(['$q', '$location', 'Authentication',
            function ($q, $location, Authentication) {
                return {
                    responseError: function (rejection) {
                        switch (rejection.status) {
                            case 401:
                                // Deauthenticate the global user
                                Authentication.user = null;

                                // Redirect to signin page
                                $location.path('signin');
                                break;
                            case 403:
                                // Add unauthorized behaviour
                                $location.path('unauthorized');
                                break;
                        }
                        return $q.reject(rejection);
                    }
                };
            }
        ]);
    }
]);


// Setting up route
angular.module('users').config(['$stateProvider',
    function ($stateProvider) {
        // Users state routing
        $stateProvider.
            state('profile', {
                url: '/settings/profile',
                templateUrl: 'modules/users/views/settings/profile.client.view.html'
            }).
            state('password', {
                url: '/settings/password',
                templateUrl: 'modules/users/views/settings/change-password.client.view.html'
            }).
            state('signup', {
                url: '/signup',
                templateUrl: 'modules/users/views/signup.client.view.html'
            }).
            state('signin', {
                url: '/signin',
                templateUrl: 'modules/users/views/signin.client.view.html'
            }).
            state('listpending', {
                url: '/admin/pending',
                templateUrl: 'modules/users/views/admin/pending.client.view.html'
            }).
            state('listapproved', {
                url: '/admin/approved',
                templateUrl: 'modules/users/views/admin/approved.client.view.html'
            }).
            state('edituser', {
                url: '/admin/user/:userId',
                templateUrl: 'modules/users/views/admin/edit.user.client.view.html'
            }).
            state('uservolumes', {
                url: '/admin/volumes',
                templateUrl: 'modules/users/views/openstack/volumes.client.view.html'
            });
    }
]);

angular.module('users').factory('Authentication', [
    function () {
        var _this = this;

        _this._data = {
            user: window.user
        };

        return _this._data;
    }
]);

angular.module('users').factory('Users', ['$resource',
    function ($resource) {
        return $resource('users/:userId', {userId: '@_id'}, {
            update: {method: 'PUT'}
        });
    }
]);

angular.module('users').factory('Volume', ['$q', '$timeout', '$rootScope', '$http',
    function ($q, $timeout, $rootScope, $http) {
        return function (user) {
            /**
             * Tell the backend to create a Volume for the user
             * When we get a volumeid back, update the user's information
             * which will then refresh the page
             */
            $http({
                url: '/users/create/volume',
                method: "POST",
                data: { 'uid': user._id }
            }).then(function (response) {
                    // success
                    user.volume_id = response.data.volid;
                    $rootScope.$broadcast('volumeUpdate', user);
                }
            );

        };
    }
]);

ngular.module('users').controller('AuthenticationController', ['$scope', '$http', '$location', 'Authentication',
    function ($scope, $http, $location, Authentication) {
        $scope.authentication = Authentication;

        //If user is signed in then redirect back home
        if ($scope.authentication.user) $location.path('/');

        $scope.credentials = {device_type: 'Nexus 7'};

        $scope.signup = function () {
            $http.post('/auth/signup', $scope.credentials).success(function (response) {
                //If successful we assign the response to the global user model
                $scope.authentication.user = response;
                //And redirect to the index page
                $location.path('/settings/profile');
            }).error(function (response) {
                $scope.error = response.message;
            });
        };

        $scope.signin = function () {
            $http.post('/auth/signin', $scope.credentials).success(function (response) {
                //If successful we assign the response to the global user model
                $scope.authentication.user = response;

                //And redirect to the index page
                if ($scope.authentication.user.roles[0] === 'admin') {
                    $location.path('/admin/pending');
                } else {
                    $location.path('/settings/profile');
                }

            }).error(function (response) {
                $scope.error = response.message;
            });
        };
    }
]);


angular.module('users').controller('SettingsController', ['$scope', '$http', '$location', 'Users', 'Authentication',
    function ($scope, $http, $location, Users, Authentication) {
        $scope.user = Authentication.user;

        // If user is not signed in then redirect back home
        if (!$scope.user) $location.path('/');

        // Change user password
        $scope.changeUserPassword = function () {
            $scope.success = $scope.error = null;

            $http.post('/users/password', $scope.passwordDetails).success(function (response) {
                // If successful show success message and clear form
                $scope.success = true;
                $scope.passwordDetails = null;
            }).error(function (response) {
                $scope.error = response.message;
            });
        };
    }
]);

angular.module('users').controller('AdminController', ['$scope', '$rootScope',
    '$stateParams', '$http', '$location', 'Users', 'Authentication', 'Volume', 'ngTableParams',
    function ($scope, $rootScope, $stateParams, $http, $location, Users, Authentication, Volume, ngTableParams) {

        $scope.authentication = Authentication;

        $scope.listPending = function () {
            Users.query({approved: 'false'}, function (users) {
                $scope.users = users;
                $scope.total = users.length;
            });
        };

        $scope.listApproved = function () {
            Users.query({approved: 'true'}).$promise.then(function (users) {
                $scope.users = users;
                $scope.total = users.length;
            });
        };

        $scope.approve = function (user) {
            user.approved = true;

            user.$update({email: true}, function () {
                $location.path('/admin/approved');
            }, function (errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

        $scope.deny = function (user) {
            var deleteuser = confirm("Are you sure you want to deny this user? If so, it will remove the user\'s account");
            if (deleteuser && user) {
                user.$remove();
                for (var i in $scope.users) {
                    if ($scope.users[i] === user) {
                        $scope.users.splice(i, 1);
                    }
                }
                $scope.total = $scope.users.length;
            }
        };

        $scope.findOne = function () {
            var id = $stateParams.userId;
            $scope.user = Users.get({userId: id});
        };

        $scope.deleteUser = function (user) {
            // Delete Volume
            /*if ($scope.rmvolume) {
             // TODO: Delete user's Volume here?
             //console.log("Delete Volume");
             }*/

            var deleteuser = confirm("Are you sure you want to deny this user? If so, it will remove the user's account");
            if (deleteuser && user) {
                user.$remove();
                $location.path('/admin/approved');
            }
        };

        $scope.updateRole = function (user) {
            user.$update(function () {
                $location.path('/admin/approved');
            }, function (err) {
                $scope.error = err.data.message;
            });
        };

        $scope.createVolume = function (user) {
            var makeVolume = confirm("Are you sure you want to create a Volume for this User?");
            if (user && makeVolume) {

                /**
                 * Set the user's volume-id to 'pending' while we try to create it
                 * this set's the animated bar in the UI
                 */
                user.volume_id = "pending";
                user.$update(function () {
                    new Volume(user);
                }, function (err) {
                    // TODO: handle the case where it fails so we can clear 'pending'
                    $scope.error = err.data.message;
                });
            }
        };

        /**
         * Here's where we actually update the user's info. with a volume id
         * if it was created.
         * @type {*|function()}
         */
        var unbind = $rootScope.$on('volumeUpdate', function (ev, u) {
            if (u) {
                u.$update(function () {
                    Users.query({approved: 'true'}).$promise.then(function (users) {
                        $scope.users = users;
                        $scope.total = users.length;
                    });
                });
            }
        });

        $scope.$on('$destroy', unbind);
    }
]);
