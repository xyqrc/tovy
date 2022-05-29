const db = require('./db/db');
const express = require('express');
const router = express.Router();  
const { fetchpfp } = require('./index');
const erouter = (usernames, pfps, settings, permissions, logging) => {
    const perms = permissions.perms
    router.get('/', async (req, res) => {
        res.send('hello');
    });
    router.get('/get/:id', async (req, res) => {
        const { id } = req.params;
        const task = await db.task.findOne({ where: { id: id } });
        if (task == null) return res.status(400).json({ error: "No such task." });
        res.json({ task: task });
    })

    router.get('/get/all', async (req, res) => {
        const userPerms = await db.user.findOne({ where: { id: req.session.userid } });
        const tasks = await db.task.findAll();
        console.log(userPerms);
        console.log('hi');
        const tasksToSend = [];
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task.assignedUsers.find(req.session.userid) || task.assignedRoles.find(userPerms.role)) {
                tasksToSend.push(task);
            }
        }
        res.json({ tasksToSend });
    })

    router.post('/create', perms('manage_tasks'), async (req, res) => {
        const { name, description, due, assignedRoles, assignedUsers } = req.body;  
        console.log(req.body);
        if (!name) return res.status(400).json({ error: "No name provided." });
        if (!description) return res.status(400).json({ error: "No description provided." });
        if (!due) return res.status(400).json({ error: "No due date provided." });  
        const task = await db.task.create({ name: name, description: description, createdAt: new Date(), due: due, id: Math.floor(Math.random() * 1000000), assignedRoles: assignedRoles, assignedUsers: assignedUsers, assignedBy: req.session.userid, creatorAvatar: pfps.get(req.session.userid) });  
        res.json({ success: true, task: task });    
        //logging.newLog(`has created a new task: **${name}**`, req.session.userid);
    })  

    router.post('/edit', perms('manage_tasks'), async (req, res) => {
        let { id, name, description, due, assignedRoles, assignedUsers } = req.body;
        const task = await db.task.findOne({ where: { id: id } });
        if (!task.assignedBy == req.session.userid) return res.status(400).json({ error: "You can't edit this task." });
        if (task == null) return res.status(400).json({ error: "No such task." });
        if (!id) return res.status(400).json({ error: "No id provided." });
        if (!name) name = task.name;
        if (!description) description = task.description;
        if (!due) due = task.due;
        if (!assignedRoles) assignedRoles = task.assignedRoles; 
        if (!assignedUsers) assignedUsers = task.assignedUsers; 
        await task.update({ name: name, description: description, due: due, assignedRoles: assignedRoles, assignedUsers: assignedUsers });
        res.json({ success: true, task: task });
        //ogging.newLog(`has edited a task: **${name}**`, req.session.userid);
    })

    router.post('/delete', perms('manage_tasks'), async (req, res) => {
        const { id } = req.body;
        const task = await db.task.findOne({ where: { id: id } });  
        if (task == null) return res.status(400).json({ error: "No such task." });
        await task.destroy();
        res.json({ success: true });
        logging.newLog(`has deleted a task: **${task.name}**`, req.session.userid);
    })

    router.post('/complete', perms('manage_tasks'), async (req, res) => {
        const { id } = req.body;
        const task = await db.task.findOne({ where: { id: id } });
        if (task == null) return res.status(400).json({ error: "No such task." });
        if (!array.includes(req.session.userid)) return res.status(400).json({ error: "You can't complete this task." });
        await task.completedUsers.push(req.session.userid);
        res.json({ success: true, task: task });
        logging.newLog(`has completed a task: **${task.name}**`, req.session.userid);
    })
    return router
}
module.exports = erouter;