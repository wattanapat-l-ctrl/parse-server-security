const Parse = require('parse/node');

Parse.initialize(
  process.env.APP_ID,
  null,
  process.env.MASTER_KEY
);

Parse.serverURL = 'http://localhost:1337/parse';

async function assignRole() {
  try {
    // หา security_admin
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('username', 'security_admin');

    const user = await userQuery.first({
      useMasterKey: true
    });

    if (!user) {
      throw new Error('ไม่พบ security_admin');
    }

    // หา Role SecurityAnalyst
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', 'SecurityAnalyst');

    const role = await roleQuery.first({
      useMasterKey: true
    });

    if (!role) {
      throw new Error('ไม่พบ Role SecurityAnalyst');
    }

    // เพิ่ม security_admin เข้า Role
    role.getUsers().add(user);

    await role.save(null, {
      useMasterKey: true
    });

    console.log('ROLE_ASSIGNED: SecurityAnalyst');
    console.log('USER: security_admin');

  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

assignRole();