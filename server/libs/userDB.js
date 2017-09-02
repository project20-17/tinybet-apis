import AWS from 'aws-sdk';
import { awsConfig } from '../../config';
import shortid from 'shortid';

const file = 'server/libs/userDB.js';

let _docClient = null;

const docClient = () => {
  if (!_docClient) {
    AWS.config.update({
      region: awsConfig.common.region,
    });

    _docClient = new AWS.DynamoDB.DocumentClient();
  }

  return _docClient;
};

const createUser = (fbUserInfo) => new Promise((resolve, reject) => {
  var params = {
    TableName: awsConfig.dynamodb.userTableName,
    Item: {
      id: shortid.generate(),
      name: fbUserInfo.name,
      fbid: fbUserInfo.id,
      pictureUrl: fbUserInfo.picture,
    },
  };

  docClient().put(params, function(err, data) {
    if (err) {
      console.error({ file, function: 'userDB.createUser', params, err });
      return reject(err);
    }

    console.log({ file, function: 'userDB.createUser', params, data });
    return resolve(data);
  });
});

const findFbIdIndex = (fbId) => new Promise((resolve, reject) => {
  const params = {
    TableName : awsConfig.dynamodb.userTableName,
    IndexName: awsConfig.dynamodb.userIndexName,
    KeyConditionExpression: 'fbid = :fbid',
    ExpressionAttributeValues: {
      ':fbid': fbId,
    },
  };

  docClient().query(params, function(err, data) {
    if (err) {
      console.error({ file, function: 'findFbIdIndex', params, err });
      return reject(err);
    }

    if (data.Count > 1) {
      console.error({ file, function: 'findFbIdIndex',
        log: 'multiple user rows with the same fbid detected', params, data,
      });
    }

    console.log({ file, function: 'findFbIdIndex', data, items: data.Items });

    return resolve(data.Items[0]);
  });
});

const findUserTable = (id) => new Promise((resolve, reject) => {
  const params = {
    TableName: awsConfig.dynamodb.userTableName,
    Key: {
      id,
    },
  };

  console.log({ file, function: 'findUserTable', params });

  docClient().get(params, function(err, data) {
    if (err) {
      console.error({ file, function: 'findUserTable', params, err });
      return reject(err);
    }

    console.log({ file, function: 'findUserTable', params, data });

    return resolve(data.Item);
  });
});

const findUser = async (id) => {
  try {
    const user = await findUserTable(id);

    console.log({ file, function: 'findUser', id, user });

    return user;
  } catch(err) {
    console.error({ file, function: 'findUser', id, err });

    return null;
  }
};

const findUserByFbId = async (fbId) => {
  try {
    const fbIdUser = await findFbIdIndex(fbId);

    if (!fbIdUser || !fbIdUser.id) return null;

    const user = await findUserTable(fbIdUser.id);

    console.log({ file, function: 'findUserByFbId', fbId, user });

    return user;
  } catch(err) {
    console.error({ file, function: 'findUserByFbId', fbId, err });

    return null;
  }
};

const userDB = {
  createUser,
  findUser,
  findUserByFbId,
};

export default userDB;