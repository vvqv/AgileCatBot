import { DataTypes, Model } from 'sequelize';

import { ChatNotifications, Licenses, Teams, User, UserGroups, UserNotifications } from '../utils';

import { db } from './index';

export const UserModel = db.define<Model<User>>(
    'user',
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true },
        userId: { type: DataTypes.STRING, unique: true },
        name: { type: DataTypes.STRING, unique: true },
        isOnVacation: { type: DataTypes.BOOLEAN },
        endVacationDateTime: { type: DataTypes.DATE, allowNull: true },
    },
    { timestamps: false }
);

export const UserGroupsModel = db.define<Model<UserGroups>>(
    'user_groups',
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true },
        userId: { type: DataTypes.STRING },
        chatId: { type: DataTypes.STRING },
        teamId: { type: DataTypes.STRING },
    },
    { timestamps: false }
);

export const LicensesModel = db.define<Model<Licenses>>(
    'licenses',
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true },
        licenseKey: { type: DataTypes.STRING, unique: true },
        chatId: { type: DataTypes.STRING, unique: true },
        expirationDate: { type: DataTypes.DATE, allowNull: true },
    },
    { timestamps: false }
);

export const TeamsModel = db.define<Model<Teams>>(
    'teams',
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true },
        chatId: { type: DataTypes.STRING },
        teamName: { type: DataTypes.STRING },
        teamId: { type: DataTypes.STRING, unique: true },
    },
    { timestamps: false }
);

export const UserNotificationsModel = db.define<Model<UserNotifications>>(
    'user_notifications',
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true },
        notificationId: { type: DataTypes.STRING, unique: true },
        title: { type: DataTypes.STRING },
        description: { type: DataTypes.STRING(50000) },
        userId: { type: DataTypes.STRING },
        startDateTime: { type: DataTypes.DATE, allowNull: false },
        endDateTime: { type: DataTypes.DATE, allowNull: false },
        repeatedDaysAmount: { type: DataTypes.INTEGER, allowNull: true },
        repeatedHoursAmount: { type: DataTypes.INTEGER, allowNull: true },
    },
    { timestamps: false }
);

export const ChatNotificationsModel = db.define<Model<ChatNotifications>>(
    'chat_notifications',
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true },
        notificationId: { type: DataTypes.STRING, unique: true },
        title: { type: DataTypes.STRING },
        description: { type: DataTypes.STRING(50000) },
        chatId: { type: DataTypes.STRING },
        startDateTime: { type: DataTypes.DATE, allowNull: false },
        endDateTime: { type: DataTypes.DATE, allowNull: false },
        repeatedDaysAmount: { type: DataTypes.INTEGER, allowNull: true },
        repeatedHoursAmount: { type: DataTypes.INTEGER, allowNull: true },
    },
    { timestamps: false }
);

UserModel.hasMany(UserGroupsModel, {
    foreignKey: 'userId',
    sourceKey: 'userId',
    onDelete: 'cascade',
});

UserModel.hasMany(UserNotificationsModel, {
    foreignKey: 'userId',
    sourceKey: 'userId',
    onDelete: 'cascade',
});

LicensesModel.hasMany(UserGroupsModel, {
    foreignKey: 'chatId',
    sourceKey: 'chatId',
    onDelete: 'cascade',
});

LicensesModel.hasMany(TeamsModel, {
    foreignKey: 'chatId',
    sourceKey: 'chatId',
    onDelete: 'cascade',
});

LicensesModel.hasMany(ChatNotificationsModel, {
    foreignKey: 'chatId',
    sourceKey: 'chatId',
    onDelete: 'cascade',
});

TeamsModel.hasMany(UserGroupsModel, {
    foreignKey: 'teamId',
    sourceKey: 'teamId',
    onDelete: 'cascade',
});

UserGroupsModel.belongsTo(UserGroupsModel, { foreignKey: 'userId' });
UserGroupsModel.belongsTo(LicensesModel, { foreignKey: 'chatId' });
UserGroupsModel.belongsTo(TeamsModel, { foreignKey: 'teamId' });
TeamsModel.belongsTo(LicensesModel, { foreignKey: 'chatId' });
ChatNotificationsModel.belongsTo(LicensesModel, { foreignKey: 'chatId' });
UserNotificationsModel.belongsTo(UserModel, { foreignKey: 'userId' });
