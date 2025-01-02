const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { DefaultAzureCredential } = require('@azure/identity');
const { ContainerAppsAPIClient } = require('@azure/arm-appcontainers');
const { Server } = require('socket.io')
const Redis = require('ioredis')

const app = express();
const PORT = 8000;

const subscriber = new Redis('redis://default:b1X8bwMf08gUhhe7zh2MpxsEPEjIO0uo@redis-13839.crce179.ap-south-1-1.ec2.redns.redis-cloud.com:13839')

const io = new Server({ cors: '*' })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(8080, () => console.log('Socket Server running on port 9002'));

// Azure Container Client
const azureCredential = new DefaultAzureCredential();
const containerClient = new ContainerAppsAPIClient(azureCredential, "0cc6b0dd-dcf0-4003-a995-a3c6eecdbe8f");

const config = {
    RESOURCE_GROUP: 'vercelClone',
    ENVIRONMENT_NAME: "managedEnvironment-vercelClone-9dd3",
    IMAGE: "azurebuildcontainer.azurecr.io/build-server:v9",
    REGION: 'Australia East'
};

app.use(express.json());

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body;
    const projectSlug = slug || generateSlug();

    try {
        // Create a container app
        const appName = projectSlug;

        await containerClient.containerApps.beginCreateOrUpdateAndWait(
            config.RESOURCE_GROUP,
            appName,
            {
                location: config.REGION,
                managedEnvironmentId: `/subscriptions/0cc6b0dd-dcf0-4003-a995-a3c6eecdbe8f/resourceGroups/${config.RESOURCE_GROUP}/providers/Microsoft.App/managedEnvironments/${config.ENVIRONMENT_NAME}`,
                configuration: {
                    ingress: {
                        external: true,
                        targetPort: 80,
                        transport: 'auto',
                        fqdn: `${appName}.${config.REGION}.azurecontainerapps.io`
                    },
                    registries: [
                        {
                            server: 'azurebuildcontainer.azurecr.io',
                            username: 'azurebuildContainer',
                            passwordSecretRef: 'reg-pswd-4daa6a83-a022'
                        }
                    ],
                    secrets: [
                        {
                            name: 'reg-pswd-4daa6a83-a022',
                            value: 'pA+4j4QNDhwFSAbAgVJEt+v3c0tGzV08mSeOh2iRPY+ACRAv046I'
                        }
                    ]
                },
                template: {
                    containers: [
                        {
                            name: 'azure-build-container',
                            image: config.IMAGE,
                            resources: {
                                cpu: 0.5,
                                memory: '1Gi'
                            },
                            env: [
                                {
                                    name: 'PROJECT_ID',
                                    value: projectSlug
                                },
                                {
                                    name: 'GIT_REPOSITORY_URL',
                                    value: gitURL
                                }
                            ]
                        }
                    ]
                }
            }
        );

        return res.json({
            status: 'queued',
            data: { projectSlug, url: `http://${projectSlug}.localhost:9000` }
        });
    } catch (error) {
        console.error('Error creating container app:', error);
        return res.status(500).json({ error: 'Failed to queue project' });
    }
});

async function initRedisSubscribe() {
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

initRedisSubscribe()


app.listen(PORT, () => console.log(`API Server Running on ${PORT}`));
