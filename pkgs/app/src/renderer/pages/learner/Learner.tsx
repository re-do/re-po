import React from "react"
import {
    Column,
    Text,
    Spinner,
    TextInput,
    AppBar,
    Icons,
    IconButton,
    ChipInput,
    ErrorText
} from "@re-do/components"
import { NexusGenInputs, NexusGenFieldTypes, Test } from "@re-do/model"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents } from "./StepCards"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import { store } from "renderer/common"

const SAVETEST = gql`
    mutation createTest($data: TestCreateInput!) {
        createOneTest(data: $data) {
            id
        }
    }
`

export const Learner = () => {
    const {
        events,
        chromiumInstalling,
        testName: name,
        testTags: tags
    } = store.hooks.useQuery({
        learner: {
            events: null,
            chromiumInstalling: null,
            testName: null,
            testTags: null
        }
    }).learner
    const [saveTest, saveTestResult] = useMutation<
        NexusGenFieldTypes["Mutation"]["createOneTest"],
        NexusGenInputs["TestCreateInput"]
    >(SAVETEST)
    return (
        <Column full>
            <AppBar height={120} align="center">
                <Column align="center">
                    <TextInput
                        value={name}
                        placeholder="Test Name"
                        colorTemplate="light"
                        kind="underlined"
                        onChange={e =>
                            store.mutate({
                                learner: { testName: e.target.value }
                            })
                        }
                    />
                    <ChipInput
                        value={tags}
                        colorTemplate="light"
                        placeholder="Add Tags"
                        onAdd={(chip: string) =>
                            store.mutate({
                                learner: { testTags: _ => [..._, chip] }
                            })
                        }
                        onDelete={(chip: string) => {
                            store.mutate({
                                learner: {
                                    testTags: _ =>
                                        _.filter(current => current !== chip)
                                }
                            })
                        }}
                    />
                </Column>
            </AppBar>
            <div>
                {chromiumInstalling ? (
                    <Column align="center">
                        <Spinner />
                        <Text>Getting things ready...</Text>
                    </Column>
                ) : (
                    <LearnerEvents steps={events} />
                )}
            </div>
            <AppBar kind="bottom" justify="space-around">
                <IconButton
                    Icon={Icons.close}
                    style={{ color: "white" }}
                    onClick={deactivateLearner}
                />
                {saveTestResult.loading ? (
                    <Spinner />
                ) : (
                    <>
                        <IconButton
                            Icon={Icons.save}
                            style={{ color: "white" }}
                            onClick={async () => {
                                await saveTest({
                                    variables: {
                                        name,
                                        tags: {
                                            create: tags.map(_ => ({ name: _ }))
                                        },
                                        // steps: events.map(
                                        //     ({ __typename, ...inputs }: any) =>
                                        //         inputs
                                        // ),
                                        steps: {} as any,
                                        user: {} as any
                                    }
                                })
                                await resetLearner()
                                await deactivateLearner()
                            }}
                        />
                        {saveTestResult.error ? (
                            <ErrorText>
                                {saveTestResult.error.message}
                            </ErrorText>
                        ) : null}
                    </>
                )}
            </AppBar>
        </Column>
    )
}
