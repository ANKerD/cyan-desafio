module.exports = function(sequelize,DataTypes) {
    return sequelize.define('point1', {
        file_id: {
            type: DataTypes.INTEGER,
            allowNull : false
        },
        value : {
            type:DataTypes.GEOMETRY('POINT'),
            allowNull : false
        }
    }, {
        freezeTableName: true
    })
};