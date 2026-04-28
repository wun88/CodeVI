import type { AstSnapshot, AstSnapshotSummary } from '../interface/ast.interface';

export const dummySnapshots: AstSnapshotSummary[] = [
  {
    id: 55,
    buildNumber: 102,
    createdAt: '2026-03-24T05:03:27.932Z',
    teamProjectId: 27,
  },
  {
    id: 54,
    buildNumber: 101,
    createdAt: '2026-03-23T14:20:11.000Z',
    teamProjectId: 27,
  }
];

export const dummySnapshotDetail: AstSnapshot = {
  id: 55,
  createdAt: '2026-03-24T05:03:27.932Z',
  updatedAt: '2026-03-24T05:03:27.932Z',
  teamProjectId: 27,
  directories: [
    {
      id: 1050,
      name: 'src',
      snapshotId: 55,
      parentDirectoryId: null,
      createdAt: '2026-03-24T05:03:28.000Z',
      updatedAt: '2026-03-24T05:03:28.000Z',
      childDirectories: [{ id: 1051, name: 'controllers', snapshotId: 55, parentDirectoryId: 1050 }],
      files: [
        {
          id: 2001,
          name: 'main.ts',
          directoryId: 1050,
          createdAt: '2026-03-24T05:03:28.000Z',
          updatedAt: '2026-03-24T05:03:28.000Z',
          classes: [],
          fileFunctions: [
            {
              id: 3001,
              name: 'bootstrap',
              startLine: 5,
              startCol: 0,
              endLine: 12,
              endCol: 1,
              fileId: 2001,
              classId: null,
              parentFunctionId: null,
              createdAt: '2026-03-24T05:03:28.000Z',
              updatedAt: '2026-03-24T05:03:28.000Z',
            }
          ]
        }
      ]
    },
    {
      id: 1051,
      name: 'controllers',
      snapshotId: 55,
      parentDirectoryId: 1050,
      createdAt: '2026-03-24T05:03:28.000Z',
      updatedAt: '2026-03-24T05:03:28.000Z',
      childDirectories: [],
      files: [
        {
          id: 2002,
          name: 'app.controller.ts',
          directoryId: 1051,
          createdAt: '2026-03-24T05:03:28.000Z',
          updatedAt: '2026-03-24T05:03:28.000Z',
          classes: [
            {
              id: 4001,
              name: 'AppController',
              startLine: 10,
              startCol: 0,
              endLine: 30,
              endCol: 1,
              fileId: 2002,
              parentClassId: null,
              parentFunctionId: null,
              createdAt: '2026-03-24T05:03:28.000Z',
              updatedAt: '2026-03-24T05:03:28.000Z',
              metrics: { cbo: 3, rfc: 8, lcom: 65, wmc: 12, dit: 2, noc: 0 },
              methods: [
                {
                  id: 3002,
                  name: 'getHello',
                  startLine: 15,
                  startCol: 2,
                  endLine: 18,
                  endCol: 3,
                  fileId: null,
                  classId: 4001,
                  parentFunctionId: null,
                  createdAt: '2026-03-24T05:03:28.000Z',
                  updatedAt: '2026-03-24T05:03:28.000Z',
                },
                {
                  id: 3003,
                  name: 'postData',
                  startLine: 20,
                  startCol: 2,
                  endLine: 25,
                  endCol: 3,
                  fileId: null,
                  classId: 4001,
                  parentFunctionId: null,
                  createdAt: '2026-03-24T05:03:28.000Z',
                  updatedAt: '2026-03-24T05:03:28.000Z',
                }
              ]
            },
            {
              id: 4002,
              name: 'class', // ⚠️ Tree-sitter artifact to be filtered
              startLine: 35,
              startCol: 0,
              endLine: 35,
              endCol: 5,
              fileId: 2002,
              parentClassId: null,
              parentFunctionId: null,
              createdAt: '2026-03-24T05:03:28.000Z',
              updatedAt: '2026-03-24T05:03:28.000Z',
              methods: []
            }
          ],
          fileFunctions: []
        }
      ]
    },
    {
      id: 1052,
      name: 'services',
      snapshotId: 55,
      parentDirectoryId: 1050,
      createdAt: '2026-03-24T05:03:28.000Z',
      updatedAt: '2026-03-24T05:03:28.000Z',
      childDirectories: [],
      files: [
        {
          id: 2003,
          name: 'app.service.ts',
          directoryId: 1052,
          createdAt: '2026-03-24T05:03:28.000Z',
          updatedAt: '2026-03-24T05:03:28.000Z',
          classes: [
            {
              id: 4003,
              name: 'AppService',
              startLine: 5,
              startCol: 0,
              endLine: 15,
              endCol: 1,
              fileId: 2003,
              parentClassId: null,
              parentFunctionId: null,
              createdAt: '2026-03-24T05:03:28.000Z',
              updatedAt: '2026-03-24T05:03:28.000Z',
              metrics: { cbo: 1, rfc: 4, lcom: 10, wmc: 5, dit: 1, noc: 2 },
              methods: [
                {
                  id: 3004,
                  name: 'processLogic',
                  startLine: 8,
                  startCol: 2,
                  endLine: 12,
                  endCol: 3,
                  fileId: null,
                  classId: 4003,
                  parentFunctionId: null,
                  createdAt: '2026-03-24T05:03:28.000Z',
                  updatedAt: '2026-03-24T05:03:28.000Z',
                }
              ]
            }
          ],
          fileFunctions: []
        }
      ]
    }
  ],
  methodCalls: [
    { callerId: 3002, calleeId: 3004 }, // getHello() calls processLogic()
    { callerId: 3003, calleeId: 3004 }  // postData() calls processLogic()
  ]
};
