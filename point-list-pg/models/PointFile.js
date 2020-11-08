module.exports = function(sequelize,DataTypes) {
    return sequelize.define('pointfile1', {
        id: {
        type: DataTypes.INTEGER,
        autoIncrement : true,
        primaryKey : true
        },
        file: {
            type:DataTypes.STRING(512),
            unique : true,
            allowNull : false
        }
    }, {
        freezeTableName: true
    });
}