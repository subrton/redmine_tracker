import { ipcMain as ipc, webContents } from 'electron';

import * as actions from '../constants/ipc';
import redmineClient from '../utils/RedmineClient';

import { setUser } from '../actions/user';
import { setProjects } from '../actions/projects';
import { setIssues } from '../actions/issues';
import { setActivities } from '../actions/activities';
import { stopEntry } from '../actions/entries';

export default class IpcApiMain {
  store: null;
  ipc: null;
  log: null;

  constructor(store, log) {
    this.store = store;
    this.ipc = ipc;
    this.log = log;
  }

  static sendToAll(action, object) {
    webContents.getAllWebContents().forEach((content) => {
      content.send(action, object);
    });
  }

  fetchUser = async (event, data) => {
    // Set credentials at first place
    redmineClient.setCredentials(data.server, data.token);

    let info = {};

    try {
      const user = await redmineClient.getUser();

      info = {
        user,
        token: data.token,
        server: data.server
      };

      this.log.info('User response OK!');
      this.store.dispatch(setUser(info));
    } catch (e) {
      info = {
        error: e
      };
    }

    IpcApiMain.sendToAll(actions.FETCH_USER_RESPONSE, info);
  }

  fetchProjects = async () => {
    let info = {};

    try {
      const projects = await redmineClient.getProjects();
      this.log.info('Projects response OK!');
      this.store.dispatch(setProjects(projects));
    } catch (e) {
      info = {
        error: e
      };
    }

    IpcApiMain.sendToAll(actions.FETCH_PROJECTS_RESPONSE, info);
  }

  fetchIssues = async (event, data) => {
    let info = {};
    const projectIdentifier = data.projectIdentifier;

    try {
      const issues = await redmineClient.getIssues(projectIdentifier);

      this.log.info(`Issues for ${projectIdentifier} response OK!`);
      this.store.dispatch(setIssues(
        projectIdentifier,
        issues
      ));
    } catch (e) {
      info = {
        error: e
      };
    }

    IpcApiMain.sendToAll(actions.FETCH_ISSUES_RESPONSE, info);
  }

  fetchActivities = async (event, data) => {
    let info = {};
    const projectIdentifier = data.projectIdentifier;

    try {
      const issues = await redmineClient.getActivities(projectIdentifier);
      this.log.info(`Activities for ${projectIdentifier} response OK!`);
      this.store.dispatch(setActivities(
        projectIdentifier,
        issues
      ));
    } catch (e) {
      info = {
        error: e
      };
    }

    IpcApiMain.sendToAll(actions.FETCH_PROJECT_ACTIVITIES_RESPONSE, info);
  }

  syncCurrentEntry = async (event, data) => {
    let info = {};

    // Fetch information from data
    const entry = data.entry;
    const endTime = data.endTime;

    let id = null;

    try {
      id = await redmineClient.createEntry({
        issueId: entry.issue,
        activity: entry.activity,
        description: entry.description,
        startTime: entry.startTime,
        endTime
      });

      info.id = id;
    } catch (e) {
      info = {
        error: e
      };
    }

    this
      .store
      .dispatch(stopEntry(endTime, id));

    IpcApiMain.sendToAll(actions.SYNC_CURRENT_ENTRY_RESPONSE, info);
  }

  bind() {
    // Users
    this.ipc.on(actions.FETCH_USER, this.fetchUser);

    // Projects
    this.ipc.on(actions.FETCH_PROJECTS, this.fetchProjects);

    // Issues
    this.ipc.on(actions.FETCH_ISSUES, this.fetchIssues);

    // Activities
    this.ipc.on(actions.FETCH_PROJECT_ACTIVITIES, this.fetchActivities);

    // Current entry sync
    this.ipc.on(actions.SYNC_CURRENT_ENTRY, this.syncCurrentEntry);
  }
}