This is not really intended to be universal. It initializes Expressjs with error handling middleware and a permission handling system called permissionMaster. 

PermissionMaster sends and interprets a Json Web Token that encodes roles and expiration to control access to resources. It relies on an external mechanism (validUser(user) here) for login authentication at the time of initial token creation.

	const validUser = getUser(body.user)
	if (validUser) {
		res.json({
			token: this.permissionMaster.getToken(validUser.role, { 
				claim1: 'whatever you need',
				claim2: 'something else to send to the UI and back'
			}),
			data: validUser
		})
	}

PermissionMaster uses the token to allow/disallow access to Expressjs routes. Eg, the following will allow only two categories of users to update user information...

	route = new RegExp('user/(.*)$');
	method = 'put';
	this.permissionMaster.addRoute(method, route, 'administrator superUser');
	this.router[method](route, (req, res, next) => {
		//whatever
	});

Instantiation of web-init requires two parameters in a configuration object, webInit and permissionManager:

	const webInitGen = require('web-init');
	const webInitWorker = new webInitGen({
		config: {
			webInit: {
				port: 8011,
				name: 'Project Name for Logging'
			},
			permissionMaster: {
				sessionExpireMinutes: 20,
				jwtSecret: '1a1d54c_SuperSecretString_f407b9b6810',
				publicFileRoleName: 'all',
				roleList: [
					'user',
					'administrator',
					'superUser'
				]
			}
		}
	});

For webInit, the parameters are obvious. PermissionMaster requires some explanation:

sessionExpireMinutes specifies the length of time before a token must be renewed. After this period, the token will no longer work. However, a new one is generated with each access to the system so this is effectively the amount of time that a user can wait between server accesses.

roleList is the list of roles that you put into the route specifications for permissionMaster. Role names are accessed by the method getRole(roleName) (revealed as a property of web-init) to avoid magic strings and prevent mispelling, eg, user.role=webInit.permissionMaster.getRole('administrator');

publicFileRoleName tells permissionMaster that anyone can access the route.

This does not depend api-manager. (I include this to remind us (especially me) that I thought this through.)

Issue: the mechanism for transmitting the token has become stupid.


