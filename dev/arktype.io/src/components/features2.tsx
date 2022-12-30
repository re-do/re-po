import React from "react"
import {
    Box,
    Container,
    Stack,
    SvgIcon,
    Typography,
    Card,
    Paper
} from "@mui/material"

import CardHeader from "@mui/material/CardHeader"
import CardMedia from "@mui/material/CardMedia"
import CardContent from "@mui/material/CardContent"

const details = [
    {
        title: "Isomorphic",
        description:
            "Define types using TS syntax. Infer them 1:1. Use them to validate your data at runtime."
    },
    {
        title: "Native TS",
        description: "No extensions, plugins or compilers required"
    },
    {
        title: "Concise",
        description: "Say more with less"
    },
    {
        title: "Fast",
        description: "..."
    },
    {
        title: "Portable",
        description:
            "Most ArkType definitions are just strings and objects. Serialize them and take them anywhere your data can go!"
    }
]

const Feature = (props: {
    title: string
    description: string
    index: number
}) => (
    <Card
        sx={{
            width: "80%",
            margin:
                props.index % 2 === 0 ? "0 0 20px 25px " : "0 25px 20px auto",
            backgroundColor: "#fff"
        }}
    >
        <CardContent>
            <Typography variant="h4">{props.title}</Typography>
            <Typography variant="body1" fontSize="1.3em">
                {props.description}
            </Typography>
        </CardContent>
        <CardMedia
            component="img"
            image="https://via.placeholder.com/800x200?text=Arktype.io+is+super+POOGERS"
            alt="Arktype Gif"
        />
    </Card>
)

const feats = details.map((feature, i) => (
    <Feature
        title={feature.title}
        description={feature.description}
        index={i}
        key={`${feature.title}-${i}`}
    />
))

export const Features2 = () => (
    <Paper
        elevation={5}
        sx={{ marginTop: "1em", backgroundColor: "primary.main" }}
    >
        <Typography component="h2" variant="h2" align="center">
            <b>Features</b>
        </Typography>
        <Stack sx={{ display: "flex" }}>{feats}</Stack>
    </Paper>
)
